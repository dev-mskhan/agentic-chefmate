/**
 * API Tests: metadata endpoints (Phase 4)
 *
 * GET /api/v1/chefs/meta/cuisines
 * GET /api/v1/chefs/meta/occasion-tags
 * GET /api/v1/chefs/meta/dietary-tags
 * GET /api/v1/chefs/meta/allergens
 *
 * All endpoints are public (no auth required) and return static constants
 * with values + human-readable labels for frontend filter UIs.
 */
import { test, expect } from '@playwright/test'
import { assertStatus } from '../../../helpers/assertions'

test.describe('GET /api/v1/chefs/meta/cuisines', () => {
  test('returns 200 with 13 cuisine values and labels — no auth required', async ({ request }) => {
    const res = await request.get('/api/v1/chefs/meta/cuisines')
    const body = await assertStatus<{ values: string[]; labels: Record<string, string> }>(res, 200)

    expect(Array.isArray(body.values)).toBe(true)
    expect(body.values).toHaveLength(13)
    expect(typeof body.labels).toBe('object')
    expect(Object.keys(body.labels)).toHaveLength(13)
    expect(body.values).toContain('PAKISTANI')
    expect(body.values).toContain('KARAHI')
    expect(body.labels['PAKISTANI']).toBe('Pakistani')
    expect(body.labels['NORTH_INDIAN']).toBe('North Indian')
  })

  test('returns 200 without any authentication headers', async ({ request }) => {
    const res = await request.get('/api/v1/chefs/meta/cuisines', { headers: {} })
    expect(res.status()).toBe(200)
  })
})

test.describe('GET /api/v1/chefs/meta/dietary-tags', () => {
  test('returns 200 with 9 dietary tag values and labels — no auth required', async ({ request }) => {
    const res = await request.get('/api/v1/chefs/meta/dietary-tags')
    const body = await assertStatus<{ values: string[]; labels: Record<string, string> }>(res, 200)

    expect(body.values).toHaveLength(9)
    expect(Object.keys(body.labels)).toHaveLength(9)
    expect(body.values).toContain('HALAL')
    expect(body.values).toContain('GLUTEN_FREE')
    expect(body.labels['HALAL']).toBe('Halal')
    expect(body.labels['GLUTEN_FREE']).toBe('Gluten Free')
  })

  test('returns 200 without authentication headers', async ({ request }) => {
    const res = await request.get('/api/v1/chefs/meta/dietary-tags')
    expect(res.status()).toBe(200)
  })
})

test.describe('GET /api/v1/chefs/meta/allergens', () => {
  test('returns 200 with 9 allergen values and labels — no auth required', async ({ request }) => {
    const res = await request.get('/api/v1/chefs/meta/allergens')
    const body = await assertStatus<{ values: string[]; labels: Record<string, string> }>(res, 200)

    expect(body.values).toHaveLength(9)
    expect(Object.keys(body.labels)).toHaveLength(9)
    expect(body.values).toContain('PEANUTS')
    expect(body.values).toContain('WHEAT_GLUTEN')
    expect(body.labels['PEANUTS']).toBe('Peanuts')
    expect(body.labels['WHEAT_GLUTEN']).toBe('Wheat / Gluten')
  })

  test('returns 200 without authentication headers', async ({ request }) => {
    const res = await request.get('/api/v1/chefs/meta/allergens')
    expect(res.status()).toBe(200)
  })
})

test.describe('GET /api/v1/chefs/meta/occasion-tags', () => {
  test('returns 200 with 8 occasion tag values and labels — no auth required', async ({ request }) => {
    const res = await request.get('/api/v1/chefs/meta/occasion-tags')
    const body = await assertStatus<{ values: string[]; labels: Record<string, string> }>(res, 200)

    expect(body.values).toHaveLength(8)
    expect(Object.keys(body.labels)).toHaveLength(8)
    expect(body.values).toContain('IFTAR')
    expect(body.values).toContain('SEHRI')
    expect(body.labels['IFTAR']).toBe('Iftar')
    expect(body.labels['SEHRI']).toBe('Sehri')
  })

  test('returns 200 without authentication headers', async ({ request }) => {
    const res = await request.get('/api/v1/chefs/meta/occasion-tags')
    expect(res.status()).toBe(200)
  })
})
