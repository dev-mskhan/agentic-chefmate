import { test, expect } from '@playwright/test'

test.describe('Phase 3 - Public Metadata (via Gateway)', () => {
  test('GET /api/v1/chefs/meta/cuisines returns 200', async ({ request }) => {
    const res = await request.get('/api/v1/chefs/meta/cuisines')
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body.values)).toBe(true)
    expect(body.values).toContain('PAKISTANI')
    expect(body.labels['PAKISTANI']).toBe('Pakistani')
  })

  test('GET /api/v1/chefs/meta/occasion-tags returns 200', async ({ request }) => {
    const res = await request.get('/api/v1/chefs/meta/occasion-tags')
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body.values)).toBe(true)
    expect(body.values.length).toBeGreaterThan(0)
  })

  test('GET /api/v1/chefs/meta/dietary-tags returns 200', async ({ request }) => {
    const res = await request.get('/api/v1/chefs/meta/dietary-tags')
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.values).toContain('HALAL')
  })

  test('GET /api/v1/chefs/meta/allergens returns 200', async ({ request }) => {
    const res = await request.get('/api/v1/chefs/meta/allergens')
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body.values)).toBe(true)
    expect(body.values.length).toBeGreaterThan(0)
  })
})