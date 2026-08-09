export const CUISINE_CATEGORIES = [
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

export type CuisineCategory = typeof CUISINE_CATEGORIES[number]
