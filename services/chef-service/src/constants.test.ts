/**
 * Unit tests for Phase 4 — Category & Tag Management constants (Tasks 13.1–13.3)
 *
 * Verifies:
 *  - Correct value counts and no duplicates
 *  - Label maps are complete (one label per value, no extra keys)
 *  - Zod schemas accept valid values and reject invalid ones
 */
import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import {
  CuisineCategoryValues, CUISINE_LABELS,
  OccasionTagValues, OCCASION_LABELS,
  DietaryTagValues, DIETARY_LABELS,
  AllergenValues, ALLERGEN_LABELS,
} from './constants'

// ─── Helper: verify no duplicates in a const array ───────────────────────────

function assertNoDuplicates(arr: readonly string[], name: string) {
  const set = new Set(arr)
  expect(set.size, `${name} has duplicate values`).toBe(arr.length)
}

// ─── Helper: verify label map is complete and has no extra keys ──────────────

function assertLabelMapComplete(
  values: readonly string[],
  labels: Record<string, string>,
  name: string,
) {
  const labelKeys = Object.keys(labels)
  expect(labelKeys.length, `${name} labels has wrong key count`).toBe(values.length)
  for (const v of values) {
    expect(labels[v], `${name} labels missing key: ${v}`).toBeTruthy()
  }
}

// ─── Task 13.1: Cuisine categories ───────────────────────────────────────────

describe('CuisineCategoryValues', () => {
  it('has exactly 13 values', () => {
    expect(CuisineCategoryValues).toHaveLength(13)
  })

  it('has no duplicates', () => {
    assertNoDuplicates(CuisineCategoryValues, 'CuisineCategoryValues')
  })

  it('CUISINE_LABELS has exactly 13 keys — one per value', () => {
    assertLabelMapComplete(CuisineCategoryValues, CUISINE_LABELS, 'CUISINE_LABELS')
  })

  it('contains required Pakistani cuisine values', () => {
    expect(CuisineCategoryValues).toContain('PAKISTANI')
    expect(CuisineCategoryValues).toContain('KARAHI')
    expect(CuisineCategoryValues).toContain('BBQ')
    expect(CuisineCategoryValues).toContain('PUNJABI')
  })

  it('CUISINE_LABELS entries are non-empty strings', () => {
    for (const [k, v] of Object.entries(CUISINE_LABELS)) {
      expect(typeof v, `label for ${k}`).toBe('string')
      expect(v.length, `label for ${k} is empty`).toBeGreaterThan(0)
    }
  })
})

// ─── Task 13.2: Occasion tags ─────────────────────────────────────────────────

describe('OccasionTagValues', () => {
  it('has exactly 8 values', () => {
    expect(OccasionTagValues).toHaveLength(8)
  })

  it('has no duplicates', () => {
    assertNoDuplicates(OccasionTagValues, 'OccasionTagValues')
  })

  it('OCCASION_LABELS is complete', () => {
    assertLabelMapComplete(OccasionTagValues, OCCASION_LABELS, 'OCCASION_LABELS')
  })

  it('contains IFTAR and SEHRI for Pakistani users', () => {
    expect(OccasionTagValues).toContain('IFTAR')
    expect(OccasionTagValues).toContain('SEHRI')
  })
})

// ─── Task 13.2: Dietary tags ──────────────────────────────────────────────────

describe('DietaryTagValues', () => {
  it('has exactly 9 values', () => {
    expect(DietaryTagValues).toHaveLength(9)
  })

  it('has no duplicates', () => {
    assertNoDuplicates(DietaryTagValues, 'DietaryTagValues')
  })

  it('DIETARY_LABELS is complete', () => {
    assertLabelMapComplete(DietaryTagValues, DIETARY_LABELS, 'DIETARY_LABELS')
  })

  it('contains HALAL as first value', () => {
    expect(DietaryTagValues[0]).toBe('HALAL')
  })
})

// ─── Task 13.2: Allergens ─────────────────────────────────────────────────────

describe('AllergenValues', () => {
  it('has exactly 9 values', () => {
    expect(AllergenValues).toHaveLength(9)
  })

  it('has no duplicates', () => {
    assertNoDuplicates(AllergenValues, 'AllergenValues')
  })

  it('ALLERGEN_LABELS is complete', () => {
    assertLabelMapComplete(AllergenValues, ALLERGEN_LABELS, 'ALLERGEN_LABELS')
  })

  it('contains common allergens', () => {
    expect(AllergenValues).toContain('PEANUTS')
    expect(AllergenValues).toContain('MILK_DAIRY')
    expect(AllergenValues).toContain('EGGS')
    expect(AllergenValues).toContain('WHEAT_GLUTEN')
  })
})

// ─── Task 13.3: Zod schema acceptance / rejection ────────────────────────────

describe('Zod schema validation from constants', () => {
  const cuisineSchema    = z.enum(CuisineCategoryValues)
  const occasionSchema   = z.enum(OccasionTagValues)
  const dietarySchema    = z.enum(DietaryTagValues)
  const allergenSchema   = z.enum(AllergenValues)

  it('accepts all valid cuisine values', () => {
    for (const v of CuisineCategoryValues) {
      expect(() => cuisineSchema.parse(v)).not.toThrow()
    }
  })

  it('rejects unknown cuisine string', () => {
    expect(() => cuisineSchema.parse('FUSION')).toThrow()
    expect(() => cuisineSchema.parse('AMERICAN')).toThrow()
    expect(() => cuisineSchema.parse('')).toThrow()
  })

  it('accepts all valid occasion tags', () => {
    for (const v of OccasionTagValues) {
      expect(() => occasionSchema.parse(v)).not.toThrow()
    }
  })

  it('rejects unknown occasion tag', () => {
    expect(() => occasionSchema.parse('BRUNCH')).toThrow()
    expect(() => occasionSchema.parse('weeknight')).toThrow() // lowercase rejected
  })

  it('accepts all valid dietary tags', () => {
    for (const v of DietaryTagValues) {
      expect(() => dietarySchema.parse(v)).not.toThrow()
    }
  })

  it('rejects unknown dietary tag', () => {
    expect(() => dietarySchema.parse('ORGANIC')).toThrow()
    expect(() => dietarySchema.parse('HALAL_CERTIFIED')).toThrow()
  })

  it('accepts all valid allergens', () => {
    for (const v of AllergenValues) {
      expect(() => allergenSchema.parse(v)).not.toThrow()
    }
  })

  it('rejects unknown allergen', () => {
    expect(() => allergenSchema.parse('MUSTARD')).toThrow()
    expect(() => allergenSchema.parse('CORN')).toThrow()
  })

  it('array of cuisine values accepts valid, rejects invalid', () => {
    const schema = z.array(cuisineSchema)
    expect(() => schema.parse(['PAKISTANI', 'KARAHI'])).not.toThrow()
    expect(() => schema.parse(['PAKISTANI', 'INVALID'])).toThrow()
  })

  it('array of dietary tags accepts valid, rejects invalid', () => {
    const schema = z.array(dietarySchema)
    expect(() => schema.parse(['HALAL', 'VEGAN'])).not.toThrow()
    expect(() => schema.parse(['HALAL', 'ORGANIC'])).toThrow()
  })
})
