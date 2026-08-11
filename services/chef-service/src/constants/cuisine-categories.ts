// ─── Cuisine Categories ───────────────────────────────────────────────────────
// Single source of truth for all cuisine category values.
// Used by: chef-profile model, dish model, Zod schemas, metadata procedures.

export const CuisineCategoryValues = [
  'PAKISTANI',
  'PUNJABI',
  'SINDHI',
  'BALOCHI',
  'PASHTUN',
  'KARAHI',
  'BBQ',
  'NORTH_INDIAN',
  'SOUTH_INDIAN',
  'MIDDLE_EASTERN',
  'CHINESE',
  'ITALIAN',
  'CONTINENTAL',
] as const

export type CuisineCategory = typeof CuisineCategoryValues[number]

export const CUISINE_LABELS: Record<CuisineCategory, string> = {
  PAKISTANI:      'Pakistani',
  PUNJABI:        'Punjabi',
  SINDHI:         'Sindhi',
  BALOCHI:        'Balochi',
  PASHTUN:        'Pashtun',
  KARAHI:         'Karahi',
  BBQ:            'BBQ',
  NORTH_INDIAN:   'North Indian',
  SOUTH_INDIAN:   'South Indian',
  MIDDLE_EASTERN: 'Middle Eastern',
  CHINESE:        'Chinese',
  ITALIAN:        'Italian',
  CONTINENTAL:    'Continental',
}

// Backward-compatible alias kept for Phase 1/3 procedures that import CUISINE_CATEGORIES
export const CUISINE_CATEGORIES = CuisineCategoryValues
