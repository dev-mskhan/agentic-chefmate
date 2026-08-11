// ─── Dietary Tags ─────────────────────────────────────────────────────────────

export const DietaryTagValues = [
  'HALAL',
  'VEGETARIAN',
  'VEGAN',
  'EGGETARIAN',
  'GLUTEN_FREE',
  'DAIRY_FREE',
  'LOW_CARB',
  'KETO',
  'HIGH_PROTEIN',
] as const

export type DietaryTag = typeof DietaryTagValues[number]

export const DIETARY_LABELS: Record<DietaryTag, string> = {
  HALAL:        'Halal',
  VEGETARIAN:   'Vegetarian',
  VEGAN:        'Vegan',
  EGGETARIAN:   'Eggetarian',
  GLUTEN_FREE:  'Gluten Free',
  DAIRY_FREE:   'Dairy Free',
  LOW_CARB:     'Low Carb',
  KETO:         'Keto',
  HIGH_PROTEIN: 'High Protein',
}
