import path from 'path';
import { PATHS } from '../../config';
import { ModFileOperations } from '../../mod-file-operations';
import { XMLBuilder, XMLParser } from 'fast-xml-parser';
import { hashLabel, readPrc } from './utils';
import {
  CharaDBEntry,
  CHARA_DB_FIELD_ORDER,
  CHARA_DB_FIELD_XML_TYPES,
} from './types';

export type { CharaDBEntry };

/**
 * High-level parser for Smash Ultimate .prc / .prcx param files.
 * Reads a binary param file and returns the data as a plain JS object (POJO).
 */
export class PRCOperations {
  static globalHashLabelsLoaded = false;
  static globalHashLabels: Map<bigint, string> = new Map();

  static addHashLabel(label: string) {
    const hash = hashLabel(label);
    this.globalHashLabels.set(hash.value, label);
  }

  static async loadGlobalHashLabels() {
    if (this.globalHashLabelsLoaded) return;

    const baseDbPath = path.join(PATHS.dataDir(), 'ui_chara_db.xml');
    const baseDbContent = await ModFileOperations.readModFile(baseDbPath);
    const parser = new XMLParser({
      ignoreAttributes: false,
    });

    const parsedXml = parser.parse(baseDbContent);

    // Traverse the parsed XML tree and collect all @_hash attribute values
    // from leaf nodes, then register them as hash labels for resolution.
    const hashValues = new Set<string>();

    function collectHashAttrs(node: unknown): void {
      if (node === null || node === undefined) return;
      if (typeof node !== 'object') return;

      if (Array.isArray(node)) {
        for (const item of node) {
          collectHashAttrs(item);
        }

        return;
      }

      const obj = node as Record<string, unknown>;

      // Check if this node has an @_hash attribute
      if (typeof obj['@_hash'] === 'string') {
        // Determine if this is a leaf: no child objects/arrays (only primitives and attributes)
        const isLeaf = Object.keys(obj).every((key) => {
          if (key.startsWith('@_')) return true; // attributes don't count
          if (key === '#text') return true; // text content is a leaf value
          return typeof obj[key] !== 'object' || obj[key] === null;
        });

        if (isLeaf) {
          hashValues.add(obj['@_hash'] as string);

          if (typeof obj['#text'] === 'string') {
            hashValues.add(obj['#text'] as string);
          }
        }
      }

      // Recurse into child properties
      for (const [key, value] of Object.entries(obj)) {
        if (key.startsWith('@_') || key === '#text') continue;
        collectHashAttrs(value);
      }
    }

    collectHashAttrs(parsedXml);

    // Register discovered labels for hash resolution
    for (const label of hashValues) {
      this.addHashLabel(label);
    }

    this.addHashLabel('db_root');

    const _characterIndexes = Array.from({ length: 16 }, (_, i) => i);

    const _builtinLabels = [
      ..._characterIndexes.flatMap((char) => [
        `n${char.toString().padStart(2, '0')}_index`,
        `c${char.toString().padStart(2, '0')}_index`,
        `c${char.toString().padStart(2, '0')}_group`,
        `characall_label_c${char.toString().padStart(2, '00')}`,
        `characall_label_article_c${char.toString().padStart(2, '00')}`,
      ]),
    ];

    for (const label of _builtinLabels) {
      this.addHashLabel(label);
    }

    this.globalHashLabelsLoaded = true;
  }
  /**
   * Parse a .prc / .prcx file at the given path and return an array of
   * {@link CharaDBEntry} objects — one per fighter in the `db_root` list.
   *
   * Property names use the same casing as the `.prcxml` `hash` attributes
   * so the data can be round-tripped back to a `.prcxml` file.
   */
  static async parsePRCFile(filePath: string): Promise<CharaDBEntry[]> {
    await this.loadGlobalHashLabels();
    const prcBuffer = await ModFileOperations.readBinaryModFile(filePath);
    const root = readPrc(prcBuffer, this.globalHashLabels);

    const dbRoot = root['db_root'];

    if (!Array.isArray(dbRoot)) {
      throw new Error(
        'Expected "db_root" to be an array in the parsed PRC file',
      );
    }

    return dbRoot as CharaDBEntry[];
  }
}

(async () => {
  console.log('STARTING PRC PARSE TEST');

  const parseResult = await PRCOperations.parsePRCFile(
    path.join(PATHS.testDir(), 'ui_chara_db.prc'),
  );

  const youngLinkEntry = parseResult.find(
    (entry) => entry.name_id === 'toonlink',
  );

  if (youngLinkEntry) {
    console.log('Parsed Toon Link entry from PRC file:', youngLinkEntry);
  }
})().catch((error) => {
  console.error('Error parsing PRC file:', error);
});
