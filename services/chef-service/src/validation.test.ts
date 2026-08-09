/**
 * Unit tests for validation logic (Task 14.2)
 *
 * Tests Zod schemas and CUISINE_CATEGORIES validation rules:
 * - displayName min/max lengths
 * - bio max length
 * - cuisineSpecialties enum validation
 * - portfolioMediaIds max count
 */
import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { CUISINE_CATEGORIES } from './constants/cuisine-categories'

// ── Re-declare inline schemas matching the procedures ────────────────────────

const displayNameSchema = z.string().min(2).max(60).trim()
const bioSchema         = z.string().max(1000)
const phoneSchema       = z.string().min(7)

const cuisineSpecialtiesSchema = z
  .array(z.string())
  .refine(
    (arr) => arr.every((c) => (CUISINE_CATEGORIES as readonly string[]).includes(c)),
    { message: 'Invalid cuisine category' },
  )
  .refine(
    (arr) => new Set(arr).size === arr.length,
    { message: 'Duplicate cuisine categories are not allowed' },
  )

const portfolioMediaIdsSchema = z.array(z.string().min(1)).max(20)

// ── displayName ──────────────────────────────────────────────────────────────

describe('displayName validation', () => {
  it('accepts a valid displayName', () => {
    expect(() => displayNameSchema.parse('Chef Ali')).not.toThrow()
  })

  it('accepts min length of 2', () => {
    expect(() => displayNameSchema.parse('ab')).not.toThrow()
  })

  it('accepts max length of 60', () => {
    expect(() => displayNameSchema.parse('a'.repeat(60))).not.toThrow()
  })

  it('rejects displayName shorter than 2 chars', () => {
    expect(() => displayNameSchema.parse('a')).toThrow()
  })

  it('rejects displayName longer than 60 chars', () => {
    expect(() => displayNameSchema.parse('a'.repeat(61))).toThrow()
  })

  it('rejects empty string', () => {
    expect(() => displayNameSchema.parse('')).toThrow()
  })
})

// ── bio ──────────────────────────────────────────────────────────────────────

describe('bio validation', () => {
  it('accepts a valid bio', () => {
    expect(() => bioSchema.parse('I am a great chef')).not.toThrow()
  })

  it('accepts empty bio', () => {
    expect(() => bioSchema.parse('')).not.toThrow()
  })

  it('accepts max length of 1000', () => {
    expect(() => bioSchema.parse('a'.repeat(1000))).not.toThrow()
  })

  it('rejects bio longer than 1000 chars', () => {
    expect(() => bioSchema.parse('a'.repeat(1001))).toThrow()
  })
})

// ── cuisineSpecialties ───────────────────────────────────────────────────────

describe('cuisineSpecialties validation', () => {
  it('accepts a valid list of cuisine categories', () => {
    expect(() => cuisineSpecialtiesSchema.parse(['PAKISTANI', 'KARAHI'])).not.toThrow()
  })

  it('accepts all valid cuisine categories', () => {
    expect(() => cuisineSpecialtiesSchema.parse([...CUISINE_CATEGORIES])).not.toThrow()
  })

  it('accepts empty array', () => {
    expect(() => cuisineSpecialtiesSchema.parse([])).not.toThrow()
  })

  it('rejects invalid cuisine category', () => {
    expect(() => cuisineSpecialtiesSchema.parse(['INVALID_CUISINE'])).toThrow()
  })

  it('rejects duplicate cuisine categories', () => {
    expect(() => cuisineSpecialtiesSchema.parse(['PAKISTANI', 'PAKISTANI'])).toThrow()
  })
})

// ── portfolioMediaIds ────────────────────────────────────────────────────────

describe('portfolioMediaIds validation', () => {
  it('accepts an array within the limit', () => {
    expect(() => portfolioMediaIdsSchema.parse(['id1', 'id2', 'id3'])).not.toThrow()
  })

  it('accepts empty array', () => {
    expect(() => portfolioMediaIdsSchema.parse([])).not.toThrow()
  })

  it('accepts exactly 20 items', () => {
    const ids = Array.from({ length: 20 }, (_, i) => `media${i}`)
    expect(() => portfolioMediaIdsSchema.parse(ids)).not.toThrow()
  })

  it('rejects more than 20 items', () => {
    const ids = Array.from({ length: 21 }, (_, i) => `media${i}`)
    expect(() => portfolioMediaIdsSchema.parse(ids)).toThrow()
  })
})
