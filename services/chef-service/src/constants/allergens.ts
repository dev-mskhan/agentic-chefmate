// ─── Allergens ────────────────────────────────────────────────────────────────

export const AllergenValues = [
  'PEANUTS',
  'TREE_NUTS',
  'MILK_DAIRY',
  'EGGS',
  'WHEAT_GLUTEN',
  'FISH',
  'SHELLFISH',
  'SOY',
  'SESAME',
] as const

export type Allergen = typeof AllergenValues[number]

export const ALLERGEN_LABELS: Record<Allergen, string> = {
  PEANUTS:      'Peanuts',
  TREE_NUTS:    'Tree Nuts',
  MILK_DAIRY:   'Milk / Dairy',
  EGGS:         'Eggs',
  WHEAT_GLUTEN: 'Wheat / Gluten',
  FISH:         'Fish',
  SHELLFISH:    'Shellfish',
  SOY:          'Soy',
  SESAME:       'Sesame',
}
