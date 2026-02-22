/**
 * PRC parsing utilities — Node.js reader/writer for Smash Ultimate .prc / .prcx param files.
 *
 * Based on https://github.com/ultimate-research/prc-rs/
 *
 * Binary format (paracobn):
 *   Header:
 *     0x00: "paracobn" magic (8 bytes)
 *     0x08: u32 hashTableSize (in bytes)
 *     0x0C: u32 refTableSize (in bytes)
 *
 *   Hash table (at offset 0x10):
 *     hashTableSize/8 entries, each a u64 Hash40 value
 *     Hash40: 40-bit value stored in 8 bytes LE — lower 32 bits = CRC32, bits 32-39 = string length
 *
 *   Ref table (at offset 0x10 + hashTableSize):
 *     Contains struct field ref-tables (pairs of u32 hashIndex + u32 paramOffset)
 *     AND null-terminated string data
 *
 *   Param data (at offset 0x10 + hashTableSize + refTableSize):
 *     Recursive param nodes, each starting with a type byte
 *
 * Param types (1-indexed to match prc-rs ParamKind enum):
 *   0x01 = Bool (1 byte value)
 *   0x02 = I8 (1 byte)
 *   0x03 = U8 (1 byte)
 *   0x04 = I16 (2 bytes LE)
 *   0x05 = U16 (2 bytes LE)
 *   0x06 = I32 (4 bytes LE)
 *   0x07 = U32 (4 bytes LE)
 *   0x08 = Float (4 bytes LE)
 *   0x09 = Hash40 (4 bytes LE — index into hash table)
 *   0x0A = String (4 bytes LE — offset into ref table for null-terminated string)
 *   0x0B = List (array): u32 count, then count × u32 offsets (relative to list start), then child params
 *   0x0C = Struct (map): u32 fieldCount, u32 refTableOffset, ref table has fieldCount pairs of
 *          (u32 hashIndex, u32 paramOffset), paramOffset relative to struct start
 */

const MAGIC = Buffer.from('paracobn', 'ascii');

/**
 * Represents a Hash40 value (40-bit hash used in Smash Ultimate).
 * The full u64 stores: bits 0-31 = CRC32, bits 32-39 = original string length.
 */
class Hash40 {
  value: bigint;

  constructor(value: bigint) {
    this.value = value & 0xffffffffffn; // mask to 40 bits
  }

  get length(): number {
    return Number((this.value >> 32n) & 0xffn);
  }

  /**
   * Returns hex string representation like "0a72a5a6784"
   */
  toHexString(): string {
    return this.value.toString(16).padStart(10, '0');
  }

  toString(): string {
    return `0x${this.toHexString()}`;
  }
}

// Pre-built CRC32 lookup table (standard polynomial 0xEDB88320)
const CRC32_TABLE = new Uint32Array(256);
(function buildCrc32Table() {
  for (let i = 0; i < 256; i++) {
    let crc = i;

    for (let j = 0; j < 8; j++) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }

    CRC32_TABLE[i] = crc >>> 0;
  }
})();

/**
 * Compute CRC32 of a string (using its UTF-8 byte representation).
 */
function crc32(str: string): number {
  const buf = Buffer.from(str, 'utf8');
  let crc = 0xffffffff;

  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ CRC32_TABLE[(crc ^ buf[i]) & 0xff];
  }

  return (crc ^ 0xffffffff) >>> 0;
}

/**
 * Compute a Hash40 from a label string.
 */
export function hashLabel(label: string): Hash40 {
  const len = Buffer.byteLength(label, 'utf8');

  const crcVal = crc32(label);
  const value = (BigInt(len) << 32n) | BigInt(crcVal);

  return new Hash40(value);
}

// =====================================================================
// ParamKind — mirrors prc-rs ParamKind enum
// =====================================================================

const ParamType = {
  BOOL: 1,
  I8: 2,
  U8: 3,
  I16: 4,
  U16: 5,
  I32: 6,
  U32: 7,
  FLOAT: 8,
  HASH: 9,
  STR: 10,
  LIST: 11,
  STRUCT: 12,
} as const;

type ParamTypeValue = (typeof ParamType)[keyof typeof ParamType];

const ParamTypeName: Record<number, string> = Object.fromEntries(
  Object.entries(ParamType).map(([k, v]) => [v, k.toLowerCase()]),
);

/** A list of key-value pairs: [Hash40, ParamKind] */
type ParamStruct = Array<[Hash40, ParamKind]>;

/** A list of ParamKind values */
type ParamList = ParamKind[];

/**
 * A param value node.
 */
class ParamKind {
  type: ParamTypeValue;
  value: boolean | number | string | Hash40 | ParamList | ParamStruct;

  constructor(
    type: ParamTypeValue,
    value: boolean | number | string | Hash40 | ParamList | ParamStruct,
  ) {
    this.type = type;
    this.value = value;
  }

  static bool(v: boolean) {
    return new ParamKind(ParamType.BOOL, v);
  }

  static i8(v: number) {
    return new ParamKind(ParamType.I8, v);
  }

  static u8(v: number) {
    return new ParamKind(ParamType.U8, v);
  }

  static i16(v: number) {
    return new ParamKind(ParamType.I16, v);
  }

  static u16(v: number) {
    return new ParamKind(ParamType.U16, v);
  }

  static i32(v: number) {
    return new ParamKind(ParamType.I32, v);
  }

  static u32(v: number) {
    return new ParamKind(ParamType.U32, v);
  }

  static float(v: number) {
    return new ParamKind(ParamType.FLOAT, v);
  }

  static hash(v: Hash40) {
    return new ParamKind(ParamType.HASH, v);
  }

  static str(v: string) {
    return new ParamKind(ParamType.STR, v);
  }

  static list(v: ParamList) {
    return new ParamKind(ParamType.LIST, v);
  }

  static struct(v: ParamStruct) {
    return new ParamKind(ParamType.STRUCT, v);
  }
}

/**
 * Cursor wrapping a Buffer for sequential reading.
 */
class BufferCursor {
  buf: Buffer;
  pos: number;

  constructor(buffer: Buffer, offset = 0) {
    this.buf = buffer;
    this.pos = offset;
  }

  seek(pos: number) {
    this.pos = pos;
  }

  tell(): number {
    return this.pos;
  }

  readU8(): number {
    const v = this.buf.readUInt8(this.pos);
    this.pos += 1;
    return v;
  }

  readI8(): number {
    const v = this.buf.readInt8(this.pos);
    this.pos += 1;
    return v;
  }

  readU16LE(): number {
    const v = this.buf.readUInt16LE(this.pos);
    this.pos += 2;
    return v;
  }

  readI16LE(): number {
    const v = this.buf.readInt16LE(this.pos);
    this.pos += 2;
    return v;
  }

  readU32LE(): number {
    const v = this.buf.readUInt32LE(this.pos);
    this.pos += 4;
    return v;
  }

  readI32LE(): number {
    const v = this.buf.readInt32LE(this.pos);
    this.pos += 4;
    return v;
  }

  readF32LE(): number {
    const v = this.buf.readFloatLE(this.pos);
    this.pos += 4;
    return v;
  }

  /**
   * Read a Hash40 (8 bytes LE, only lower 40 bits meaningful).
   */
  readHash40LE(): Hash40 {
    const lo = this.buf.readUInt32LE(this.pos);
    const hi = this.buf.readUInt32LE(this.pos + 4);
    this.pos += 8;
    // Hash40 is 40 bits: hi byte (bits 32-39) = string length, lo (bits 0-31) = crc32
    return new Hash40((BigInt(hi) << 32n) | BigInt(lo));
  }

  readNullTermString(): string {
    let str = '';

    while (this.pos < this.buf.length) {
      const ch = this.buf[this.pos++];
      if (ch === 0) break;
      str += String.fromCharCode(ch);
    }
    return str;
  }
}

interface RefTableEntry {
  hashIndex: number;
  paramOffset: number;
}

/**
 * Read/disassemble a binary prc/prcx file into a ParamStruct.
 */
export function readPrc(
  buf: Buffer,
  hashLabels: Map<bigint, string>,
): Record<string, unknown> {
  const cursor = new BufferCursor(buf);

  // Validate magic
  const magic = buf.slice(0, 8);

  if (!magic.equals(MAGIC)) {
    throw new Error(
      `Invalid file magic: expected "paracobn", got "${magic.toString('ascii')}"`,
    );
  }

  cursor.seek(8);

  const hashTableSize = cursor.readU32LE();
  const refTableSize = cursor.readU32LE();

  const hashStart = cursor.tell(); // 0x10
  const refStart = hashStart + hashTableSize;
  const paramStart = refStart + refTableSize;
  const hashCount = hashTableSize / 8;

  // Build hash table
  const hashTable: Hash40[] = [];

  for (let i = 0; i < hashCount; i++) {
    hashTable.push(cursor.readHash40LE());
  }

  // Cache for ref tables (keyed by refTableOffset) — mirrors prc-rs ref_tables HashMap
  const refTablesCache = new Map<number, RefTableEntry[]>();

  /**
   * Read a ref table from the ref section at the given offset.
   * Returns array of { hashIndex, paramOffset } pairs sorted by hashIndex.
   * Uses cache to avoid re-reading shared tables.
   */
  function getRefTable(refOffset: number, size: number): RefTableEntry[] {
    if (refTablesCache.has(refOffset)) {
      return refTablesCache.get(refOffset)!;
    }

    const saved = cursor.tell();
    cursor.seek(refStart + refOffset);
    const table: RefTableEntry[] = [];

    for (let i = 0; i < size; i++) {
      table.push({
        hashIndex: cursor.readU32LE(),
        paramOffset: cursor.readU32LE(),
      });
    }

    table.sort((a, b) => a.hashIndex - b.hashIndex);
    cursor.seek(saved);
    refTablesCache.set(refOffset, table);

    return table;
  }

  /**
   * Recursively read a param node at the current cursor position.
   */
  function readParam(): ParamKind {
    const typeByte = cursor.readU8();

    switch (typeByte) {
      case ParamType.BOOL:
        return ParamKind.bool(cursor.readU8() !== 0);

      case ParamType.I8:
        return ParamKind.i8(cursor.readI8());

      case ParamType.U8:
        return ParamKind.u8(cursor.readU8());

      case ParamType.I16:
        return ParamKind.i16(cursor.readI16LE());

      case ParamType.U16:
        return ParamKind.u16(cursor.readU16LE());

      case ParamType.I32:
        return ParamKind.i32(cursor.readI32LE());

      case ParamType.U32:
        return ParamKind.u32(cursor.readU32LE());

      case ParamType.FLOAT:
        return ParamKind.float(cursor.readF32LE());

      case ParamType.HASH: {
        const idx = cursor.readI32LE();
        return ParamKind.hash(hashTable[idx]);
      }

      case ParamType.STR: {
        const strOffset = cursor.readU32LE();
        const saved = cursor.tell();

        cursor.seek(refStart + strOffset);

        const str = cursor.readNullTermString();
        // Note: prc-rs does NOT seek back after reading a string
        // (the comment in disasm.rs says "remembering where we were is actually unnecessary")
        // but we do to support sequential reading in lists/structs that may follow

        cursor.seek(saved);

        return ParamKind.str(str);
      }

      case ParamType.LIST: {
        // pos is right after the type byte; prc-rs uses pos = cursor - 1
        const listStart = cursor.tell() - 1;
        const count = cursor.readU32LE();

        // Read offset table
        const offsets: number[] = [];

        for (let i = 0; i < count; i++) {
          offsets.push(cursor.readU32LE());
        }

        // Read each child param at listStart + offset
        const items: ParamKind[] = [];

        for (let i = 0; i < count; i++) {
          cursor.seek(listStart + offsets[i]);
          items.push(readParam());
        }

        return ParamKind.list(items);
      }

      case ParamType.STRUCT: {
        const structStart = cursor.tell() - 1;
        const fieldCount = cursor.readU32LE();
        const refOffset = cursor.readU32LE();

        const table = getRefTable(refOffset, fieldCount);

        const fields: ParamStruct = [];

        for (const { hashIndex, paramOffset } of table) {
          cursor.seek(structStart + paramOffset);
          fields.push([hashTable[hashIndex], readParam()]);
        }

        return ParamKind.struct(fields);
      }

      default:
        throw new Error(
          `Unknown param type 0x${typeByte.toString(16)} at offset 0x${(cursor.tell() - 1).toString(16)}`,
        );
    }
  }

  // Root must be a struct (type 0x0C)
  cursor.seek(paramStart);

  const rootTypeByte = cursor.readU8();

  if (rootTypeByte !== ParamType.STRUCT) {
    throw new Error(
      `Param file does not contain a root struct (got type 0x${rootTypeByte.toString(16)})`,
    );
  }

  cursor.seek(paramStart); // seek back so readParam reads the type byte

  const rootParam = readParam();

  return structToPojo(rootParam.value as ParamStruct, hashLabels);
}

/**
 * Resolve a Hash40 to its label string, or return the hex representation.
 */
function resolveHash(hash40: Hash40, hashLabels: Map<bigint, string>): string {
  if (hash40.value === 0n) return '';
  return hashLabels.get(hash40.value) || hash40.toString();
}

/**
 * Convert a ParamKind to a plain JS value (POJO).
 * - Bool/I8/U8/I16/U16/I32/U32/Float/Str → primitive value
 * - Hash → resolved label string (or hex string)
 * - List → array of converted children
 * - Struct → object with resolved key names mapped to converted children
 */
function paramToPojo(
  param: ParamKind,
  hashLabels: Map<bigint, string>,
): unknown {
  switch (param.type) {
    case ParamType.BOOL:
    case ParamType.I8:
    case ParamType.U8:
    case ParamType.I16:
    case ParamType.U16:
    case ParamType.I32:
    case ParamType.U32:
    case ParamType.FLOAT:
    case ParamType.STR:
      return param.value;

    case ParamType.HASH:
      return resolveHash(param.value as Hash40, hashLabels);

    case ParamType.LIST:
      return (param.value as ParamList).map((paramKind) =>
        paramToPojo(paramKind, hashLabels),
      );

    case ParamType.STRUCT:
      return structToPojo(param.value as ParamStruct, hashLabels);

    default:
      return null;
  }
}

/**
 * Convert a ParamStruct (array of [Hash40, ParamKind] pairs) to a plain object.
 * Keys are resolved hash label strings; values are recursively converted.
 */
function structToPojo(
  paramStruct: ParamStruct,
  hashLabels: Map<bigint, string>,
): Record<string, unknown> {
  const obj: Record<string, unknown> = {};

  for (const [hash, child] of paramStruct) {
    const key = resolveHash(hash, hashLabels) || hash.toHexString();
    obj[key] = paramToPojo(child, hashLabels);
  }

  return obj;
}
