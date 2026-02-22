/**
 * Represents a single fighter entry in the ui_chara_db.
 *
 * Property names match the `hash` attribute names from the .prcxml schema
 * so the object can be round-tripped back to a .prcxml file.
 */
export interface CharaDBEntry {
  /** hash40 – e.g. "ui_chara_mario" */
  ui_chara_id: string;
  /** string – e.g. "mario" */
  name_id: string;
  /** hash40 – e.g. "fighter_kind_mario" */
  fighter_kind: string;
  /** hash40 – e.g. "fighter_kind_mario" */
  fighter_kind_corps: string;
  /** hash40 – e.g. "ui_series_mario" */
  ui_series_id: string;
  /** hash40 – e.g. "fighter_type_normal" */
  fighter_type: string;
  /** hash40 – alternate character id (may be empty string) */
  alt_chara_id: string;

  /** short */
  exhibit_year: number;
  /** int */
  exhibit_day_order: number;
  /** sbyte */
  ext_skill_page_num: number;

  /** bool */
  is_img_ext_skill_page0: boolean;
  /** bool */
  is_img_ext_skill_page1: boolean;
  /** bool */
  is_img_ext_skill_page2: boolean;

  /** sbyte */
  skill_list_order: number;
  /** sbyte */
  disp_order: number;
  /** sbyte */
  save_no: number;
  /** sbyte */
  chara_count: number;

  /** bool */
  can_select: boolean;
  /** bool */
  is_usable_soundtest: boolean;
  /** bool */
  is_called_pokemon: boolean;
  /** bool */
  is_mii: boolean;
  /** bool */
  is_boss: boolean;
  /** bool */
  is_hidden_boss: boolean;
  /** bool */
  is_dlc: boolean;
  /** bool */
  is_patch: boolean;
  /** bool */
  is_plural_message: boolean;
  /** bool */
  is_plural_narration: boolean;
  /** bool */
  is_article: boolean;

  /** int */
  extra_flags: number;

  /** bool */
  has_multiple_face: boolean;
  /** bool */
  result_pf0: boolean;
  /** bool */
  result_pf1: boolean;
  /** bool */
  result_pf2: boolean;

  /** byte */
  color_num: number;

  /** byte – costume indices c00–c15 */
  c00_index: number;
  c01_index: number;
  c02_index: number;
  c03_index: number;
  c04_index: number;
  c05_index: number;
  c06_index: number;
  c07_index: number;
  c08_index: number;
  c09_index: number;
  c10_index: number;
  c11_index: number;
  c12_index: number;
  c13_index: number;
  c14_index: number;
  c15_index: number;

  /** byte – name indices n00–n15 */
  n00_index: number;
  n01_index: number;
  n02_index: number;
  n03_index: number;
  n04_index: number;
  n05_index: number;
  n06_index: number;
  n07_index: number;
  n08_index: number;
  n09_index: number;
  n10_index: number;
  n11_index: number;
  n12_index: number;
  n13_index: number;
  n14_index: number;
  n15_index: number;

  /** byte – costume groups c00–c15 */
  c00_group: number;
  c01_group: number;
  c02_group: number;
  c03_group: number;
  c04_group: number;
  c05_group: number;
  c06_group: number;
  c07_group: number;
  c08_group: number;
  c09_group: number;
  c10_group: number;
  c11_group: number;
  c12_group: number;
  c13_group: number;
  c14_group: number;
  c15_group: number;

  /** hash40 – character-call narration labels c00–c15 */
  characall_label_c00: string;
  characall_label_c01: string;
  characall_label_c02: string;
  characall_label_c03: string;
  characall_label_c04: string;
  characall_label_c05: string;
  characall_label_c06: string;
  characall_label_c07: string;
  characall_label_c08: string;
  characall_label_c09: string;
  characall_label_c10: string;
  characall_label_c11: string;
  characall_label_c12: string;
  characall_label_c13: string;
  characall_label_c14: string;
  characall_label_c15: string;

  /** hash40 – character-call article labels c00–c15 */
  characall_label_article_c00: string;
  characall_label_article_c01: string;
  characall_label_article_c02: string;
  characall_label_article_c03: string;
  characall_label_article_c04: string;
  characall_label_article_c05: string;
  characall_label_article_c06: string;
  characall_label_article_c07: string;
  characall_label_article_c08: string;
  characall_label_article_c09: string;
  characall_label_article_c10: string;
  characall_label_article_c11: string;
  characall_label_article_c12: string;
  characall_label_article_c13: string;
  characall_label_article_c14: string;
  characall_label_article_c15: string;

  /** hash40 – shop item tag (may be empty string) */
  shop_item_tag: string;
}

/**
 * XML element tag name used for each field when serialising to `.prcxml`.
 * Maps every {@link CharaDBEntry} key to its prcxml element type.
 */
export const CHARA_DB_FIELD_XML_TYPES: Record<keyof CharaDBEntry, string> = {
  ui_chara_id: 'hash40',
  name_id: 'string',
  fighter_kind: 'hash40',
  fighter_kind_corps: 'hash40',
  ui_series_id: 'hash40',
  fighter_type: 'hash40',
  alt_chara_id: 'hash40',
  exhibit_year: 'short',
  exhibit_day_order: 'int',
  ext_skill_page_num: 'sbyte',
  is_img_ext_skill_page0: 'bool',
  is_img_ext_skill_page1: 'bool',
  is_img_ext_skill_page2: 'bool',
  skill_list_order: 'sbyte',
  disp_order: 'sbyte',
  save_no: 'sbyte',
  chara_count: 'sbyte',
  can_select: 'bool',
  is_usable_soundtest: 'bool',
  is_called_pokemon: 'bool',
  is_mii: 'bool',
  is_boss: 'bool',
  is_hidden_boss: 'bool',
  is_dlc: 'bool',
  is_patch: 'bool',
  is_plural_message: 'bool',
  is_plural_narration: 'bool',
  is_article: 'bool',
  extra_flags: 'int',
  has_multiple_face: 'bool',
  result_pf0: 'bool',
  result_pf1: 'bool',
  result_pf2: 'bool',
  color_num: 'byte',
  c00_index: 'byte',
  c01_index: 'byte',
  c02_index: 'byte',
  c03_index: 'byte',
  c04_index: 'byte',
  c05_index: 'byte',
  c06_index: 'byte',
  c07_index: 'byte',
  c08_index: 'byte',
  c09_index: 'byte',
  c10_index: 'byte',
  c11_index: 'byte',
  c12_index: 'byte',
  c13_index: 'byte',
  c14_index: 'byte',
  c15_index: 'byte',
  n00_index: 'byte',
  n01_index: 'byte',
  n02_index: 'byte',
  n03_index: 'byte',
  n04_index: 'byte',
  n05_index: 'byte',
  n06_index: 'byte',
  n07_index: 'byte',
  n08_index: 'byte',
  n09_index: 'byte',
  n10_index: 'byte',
  n11_index: 'byte',
  n12_index: 'byte',
  n13_index: 'byte',
  n14_index: 'byte',
  n15_index: 'byte',
  c00_group: 'byte',
  c01_group: 'byte',
  c02_group: 'byte',
  c03_group: 'byte',
  c04_group: 'byte',
  c05_group: 'byte',
  c06_group: 'byte',
  c07_group: 'byte',
  c08_group: 'byte',
  c09_group: 'byte',
  c10_group: 'byte',
  c11_group: 'byte',
  c12_group: 'byte',
  c13_group: 'byte',
  c14_group: 'byte',
  c15_group: 'byte',
  characall_label_c00: 'hash40',
  characall_label_c01: 'hash40',
  characall_label_c02: 'hash40',
  characall_label_c03: 'hash40',
  characall_label_c04: 'hash40',
  characall_label_c05: 'hash40',
  characall_label_c06: 'hash40',
  characall_label_c07: 'hash40',
  characall_label_c08: 'hash40',
  characall_label_c09: 'hash40',
  characall_label_c10: 'hash40',
  characall_label_c11: 'hash40',
  characall_label_c12: 'hash40',
  characall_label_c13: 'hash40',
  characall_label_c14: 'hash40',
  characall_label_c15: 'hash40',
  characall_label_article_c00: 'hash40',
  characall_label_article_c01: 'hash40',
  characall_label_article_c02: 'hash40',
  characall_label_article_c03: 'hash40',
  characall_label_article_c04: 'hash40',
  characall_label_article_c05: 'hash40',
  characall_label_article_c06: 'hash40',
  characall_label_article_c07: 'hash40',
  characall_label_article_c08: 'hash40',
  characall_label_article_c09: 'hash40',
  characall_label_article_c10: 'hash40',
  characall_label_article_c11: 'hash40',
  characall_label_article_c12: 'hash40',
  characall_label_article_c13: 'hash40',
  characall_label_article_c14: 'hash40',
  characall_label_article_c15: 'hash40',
  shop_item_tag: 'hash40',
};

/**
 * Ordered list of {@link CharaDBEntry} field names, matching the element
 * order used in the canonical `.prcxml` files.
 */
export const CHARA_DB_FIELD_ORDER: (keyof CharaDBEntry)[] = Object.keys(
  CHARA_DB_FIELD_XML_TYPES,
) as (keyof CharaDBEntry)[];
