// ─── Occasion Tags ────────────────────────────────────────────────────────────

export const OccasionTagValues = [
  'WEEKNIGHT',
  'DATE_NIGHT',
  'MEAL_PREP',
  'FAMILY',
  'PARTY',
  'OFFICE_LUNCH',
  'IFTAR',
  'SEHRI',
] as const

export type OccasionTag = typeof OccasionTagValues[number]

export const OCCASION_LABELS: Record<OccasionTag, string> = {
  WEEKNIGHT:    'Weeknight Dinner',
  DATE_NIGHT:   'Date Night',
  MEAL_PREP:    'Meal Prep',
  FAMILY:       'Family Meal',
  PARTY:        'Party / Gathering',
  OFFICE_LUNCH: 'Office Lunch',
  IFTAR:        'Iftar',
  SEHRI:        'Sehri',
}
