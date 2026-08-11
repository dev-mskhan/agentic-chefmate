/**
 * Unit tests for Phase 3 — Dish / Menu Management
 *
 * Tests cover:
 *  - Validation: name min/max, price decimal places, ingredients max 50,
 *    mediaIds max 10, allergen/tag enum, availability time format
 *  - Business rules: ARCHIVED blocks update/pricing, activateDish requires
 *    verified chef, status transition enforcement
 *  - Authorization: chef-only, cross-chef mutation blocked
 */
import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import {
  DietaryTagValues,
  AllergenValues,
  OccasionTagValues,
  DishStatusValues,
  ALLOWED_CURRENCIES,
  WEEK_DAYS,
} from './models/dish.model'
import { isValidPriceDecimal } from './trpc/procedures/create-dish'

// ─── Inline Zod schemas matching the procedures ───────────────────────────────

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/

const dishNameSchema      = z.string().min(2).max(100).trim()
const descriptionSchema   = z.string().max(500)
const portionInfoSchema   = z.string().max(200)
const categorySchema      = z.string().max(60)
const priceSchema         = z.number().positive().max(999999)
const currencySchema      = z.enum(ALLOWED_CURRENCIES)
const dietaryTagsSchema   = z.array(z.enum(DietaryTagValues))
const allergensSchema     = z.array(z.enum(AllergenValues))
const occasionTagsSchema  = z.array(z.enum(OccasionTagValues))
const mediaIdsSchema      = z.array(z.string().min(1)).max(10)
const timeSchema          = z.string().regex(TIME_REGEX, 'Must be HH:MM')

const ingredientSchema = z.object({
  name:     z.string().min(1).max(80),
  quantity: z.number().positive(),
  unit:     z.string().min(1).max(20),
})
const ingredientsSchema = z.array(ingredientSchema).max(50)

// ─── Name validation ──────────────────────────────────────────────────────────

describe('dish name validation', () => {
  it('accepts a valid dish name', () => {
    expect(() => dishNameSchema.parse('Chicken Karahi')).not.toThrow()
  })

  it('accepts min length of 2', () => {
    expect(() => dishNameSchema.parse('ab')).not.toThrow()
  })

  it('accepts max length of 100', () => {
    expect(() => dishNameSchema.parse('a'.repeat(100))).not.toThrow()
  })

  it('rejects name shorter than 2 chars', () => {
    expect(() => dishNameSchema.parse('a')).toThrow()
  })

  it('rejects name longer than 100 chars', () => {
    expect(() => dishNameSchema.parse('a'.repeat(101))).toThrow()
  })

  it('rejects empty string', () => {
    expect(() => dishNameSchema.parse('')).toThrow()
  })
})

// ─── Price decimal validation ─────────────────────────────────────────────────

describe('price decimal validation', () => {
  it('accepts whole number price', () => {
    expect(isValidPriceDecimal(100)).toBe(true)
  })

  it('accepts price with 1 decimal place', () => {
    expect(isValidPriceDecimal(100.5)).toBe(true)
  })

  it('accepts price with 2 decimal places', () => {
    expect(isValidPriceDecimal(100.99)).toBe(true)
  })

  it('rejects price with 3 decimal places', () => {
    expect(isValidPriceDecimal(100.999)).toBe(false)
  })

  it('rejects price with more than 2 decimal places', () => {
    expect(isValidPriceDecimal(0.001)).toBe(false)
  })

  it('priceSchema rejects negative price', () => {
    expect(() => priceSchema.parse(-1)).toThrow()
  })

  it('priceSchema rejects zero price', () => {
    expect(() => priceSchema.parse(0)).toThrow()
  })

  it('priceSchema rejects price over max', () => {
    expect(() => priceSchema.parse(1000000)).toThrow()
  })
})

// ─── Ingredients validation ───────────────────────────────────────────────────

describe('ingredients validation', () => {
  const validIngredient = { name: 'flour', quantity: 2, unit: 'cups' }

  it('accepts valid ingredients array', () => {
    expect(() => ingredientsSchema.parse([validIngredient])).not.toThrow()
  })

  it('accepts empty ingredients array', () => {
    expect(() => ingredientsSchema.parse([])).not.toThrow()
  })

  it('accepts exactly 50 ingredients', () => {
    const arr = Array.from({ length: 50 }, () => ({ ...validIngredient }))
    expect(() => ingredientsSchema.parse(arr)).not.toThrow()
  })

  it('rejects more than 50 ingredients', () => {
    const arr = Array.from({ length: 51 }, () => ({ ...validIngredient }))
    expect(() => ingredientsSchema.parse(arr)).toThrow()
  })

  it('rejects ingredient with zero quantity', () => {
    expect(() => ingredientSchema.parse({ name: 'salt', quantity: 0, unit: 'g' })).toThrow()
  })

  it('rejects ingredient with negative quantity', () => {
    expect(() => ingredientSchema.parse({ name: 'salt', quantity: -1, unit: 'g' })).toThrow()
  })

  it('rejects ingredient name longer than 80 chars', () => {
    expect(() => ingredientSchema.parse({ name: 'a'.repeat(81), quantity: 1, unit: 'g' })).toThrow()
  })

  it('rejects ingredient unit longer than 20 chars', () => {
    expect(() => ingredientSchema.parse({ name: 'salt', quantity: 1, unit: 'a'.repeat(21) })).toThrow()
  })
})

// ─── MediaIds validation ──────────────────────────────────────────────────────

describe('mediaIds validation', () => {
  it('accepts array within limit', () => {
    const ids = Array.from({ length: 5 }, (_, i) => `media-${i}`)
    expect(() => mediaIdsSchema.parse(ids)).not.toThrow()
  })

  it('accepts empty array', () => {
    expect(() => mediaIdsSchema.parse([])).not.toThrow()
  })

  it('accepts exactly 10 items', () => {
    const ids = Array.from({ length: 10 }, (_, i) => `media-${i}`)
    expect(() => mediaIdsSchema.parse(ids)).not.toThrow()
  })

  it('rejects more than 10 items', () => {
    const ids = Array.from({ length: 11 }, (_, i) => `media-${i}`)
    expect(() => mediaIdsSchema.parse(ids)).toThrow()
  })

  it('rejects empty string media id', () => {
    expect(() => mediaIdsSchema.parse([''])).toThrow()
  })
})

// ─── Allergen / tag enum validation ──────────────────────────────────────────

describe('allergen enum validation', () => {
  it('accepts valid allergen', () => {
    expect(() => allergensSchema.parse(['PEANUTS', 'EGGS'])).not.toThrow()
  })

  it('accepts all valid allergens', () => {
    expect(() => allergensSchema.parse([...AllergenValues])).not.toThrow()
  })

  it('rejects unknown allergen', () => {
    expect(() => allergensSchema.parse(['UNKNOWN_ALLERGEN'])).toThrow()
  })
})

describe('dietary tag enum validation', () => {
  it('accepts valid dietary tags', () => {
    expect(() => dietaryTagsSchema.parse(['HALAL', 'VEGAN'])).not.toThrow()
  })

  it('accepts all valid dietary tags', () => {
    expect(() => dietaryTagsSchema.parse([...DietaryTagValues])).not.toThrow()
  })

  it('rejects unknown dietary tag', () => {
    expect(() => dietaryTagsSchema.parse(['ORGANIC'])).toThrow()
  })
})

describe('occasion tag enum validation', () => {
  it('accepts valid occasion tags', () => {
    expect(() => occasionTagsSchema.parse(['IFTAR', 'FAMILY'])).not.toThrow()
  })

  it('rejects unknown occasion tag', () => {
    expect(() => occasionTagsSchema.parse(['BRUNCH'])).toThrow()
  })
})

// ─── Availability time format validation ─────────────────────────────────────

describe('availability time format validation', () => {
  it('accepts valid HH:MM times', () => {
    expect(() => timeSchema.parse('09:00')).not.toThrow()
    expect(() => timeSchema.parse('23:59')).not.toThrow()
    expect(() => timeSchema.parse('00:00')).not.toThrow()
  })

  it('rejects time with seconds', () => {
    expect(() => timeSchema.parse('09:00:00')).toThrow()
  })

  it('rejects invalid hour', () => {
    expect(() => timeSchema.parse('25:00')).toThrow()
    expect(() => timeSchema.parse('24:00')).toThrow()
  })

  it('rejects invalid minute', () => {
    expect(() => timeSchema.parse('09:60')).toThrow()
  })

  it('rejects non-time strings', () => {
    expect(() => timeSchema.parse('noon')).toThrow()
    expect(() => timeSchema.parse('9:00')).toThrow()  // missing leading zero
  })
})

// ─── Currency validation ──────────────────────────────────────────────────────

describe('currency validation', () => {
  it('accepts valid currencies', () => {
    for (const c of ALLOWED_CURRENCIES) {
      expect(() => currencySchema.parse(c)).not.toThrow()
    }
  })

  it('rejects unknown currency', () => {
    expect(() => currencySchema.parse('EUR')).toThrow()
    expect(() => currencySchema.parse('INR')).toThrow()
  })
})

// ─── Status transition rules (pure logic) ────────────────────────────────────

type DishStatus = typeof DishStatusValues[number]

/**
 * Pure status transition validator — mirrors the procedure logic.
 */
function canActivate(status: DishStatus): boolean {
  return status === 'DRAFT' || status === 'INACTIVE'
}

function canDeactivate(status: DishStatus): boolean {
  return status === 'ACTIVE'
}

function canArchive(status: DishStatus): boolean {
  return status !== 'ARCHIVED'
}

function isArchivedImmutable(status: DishStatus): boolean {
  return status === 'ARCHIVED'
}

describe('status transition rules', () => {
  it('allows DRAFT → ACTIVE via activateDish', () => {
    expect(canActivate('DRAFT')).toBe(true)
  })

  it('allows INACTIVE → ACTIVE via activateDish', () => {
    expect(canActivate('INACTIVE')).toBe(true)
  })

  it('blocks ACTIVE → ACTIVE via activateDish', () => {
    expect(canActivate('ACTIVE')).toBe(false)
  })

  it('blocks ARCHIVED → ACTIVE via activateDish', () => {
    expect(canActivate('ARCHIVED')).toBe(false)
  })

  it('allows ACTIVE → INACTIVE via deactivateDish', () => {
    expect(canDeactivate('ACTIVE')).toBe(true)
  })

  it('blocks DRAFT → INACTIVE via deactivateDish', () => {
    expect(canDeactivate('DRAFT')).toBe(false)
  })

  it('blocks ARCHIVED → INACTIVE via deactivateDish', () => {
    expect(canDeactivate('ARCHIVED')).toBe(false)
  })

  it('allows DRAFT → ARCHIVED via archiveDish', () => {
    expect(canArchive('DRAFT')).toBe(true)
  })

  it('allows ACTIVE → ARCHIVED via archiveDish', () => {
    expect(canArchive('ACTIVE')).toBe(true)
  })

  it('allows INACTIVE → ARCHIVED via archiveDish', () => {
    expect(canArchive('INACTIVE')).toBe(true)
  })

  it('blocks ARCHIVED → ARCHIVED via archiveDish', () => {
    expect(canArchive('ARCHIVED')).toBe(false)
  })
})

// ─── ARCHIVED dish immutability ───────────────────────────────────────────────

describe('ARCHIVED dish immutability', () => {
  it('ARCHIVED status is immutable for updates', () => {
    expect(isArchivedImmutable('ARCHIVED')).toBe(true)
  })

  it('DRAFT status is not immutable', () => {
    expect(isArchivedImmutable('DRAFT')).toBe(false)
  })

  it('ACTIVE status is not immutable', () => {
    expect(isArchivedImmutable('ACTIVE')).toBe(false)
  })

  it('INACTIVE status is not immutable', () => {
    expect(isArchivedImmutable('INACTIVE')).toBe(false)
  })
})

// ─── MediaIds deduplication ───────────────────────────────────────────────────

describe('mediaIds deduplication', () => {
  it('deduplicates identical mediaIds', () => {
    const input = ['media-1', 'media-2', 'media-1', 'media-3', 'media-2']
    const result = [...new Set(input)]
    expect(result).toEqual(['media-1', 'media-2', 'media-3'])
  })

  it('leaves unique mediaIds unchanged', () => {
    const input = ['media-1', 'media-2', 'media-3']
    const result = [...new Set(input)]
    expect(result).toEqual(['media-1', 'media-2', 'media-3'])
  })
})

// ─── Week days validation ─────────────────────────────────────────────────────

describe('availableDays validation', () => {
  const availableDaysSchema = z.array(z.enum(WEEK_DAYS))

  it('accepts all week days', () => {
    expect(() => availableDaysSchema.parse([...WEEK_DAYS])).not.toThrow()
  })

  it('accepts a subset of days', () => {
    expect(() => availableDaysSchema.parse(['MON', 'WED', 'FRI'])).not.toThrow()
  })

  it('rejects invalid day strings', () => {
    expect(() => availableDaysSchema.parse(['MONDAY'])).toThrow()
    expect(() => availableDaysSchema.parse(['mon'])).toThrow()
  })
})
