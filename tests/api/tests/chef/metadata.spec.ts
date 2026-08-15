import { test, expect } from '@playwright/test'

const CHEF_SERVICE_URL = process.env['CHEF_SERVICE_URL'] ?? 'http://localhost:3003'

test.describe('Chef Service - Public Metadata Routes', () => {

  test('GET /api/v1/chefs/meta/cuisines returns 200 with cuisine values and labels', async ({ request }) => {
    const res = await request.get(`${CHEF_SERVICE_URL}/api/v1/chefs/meta/cuisines`)
    expect(res.status()).toBe(200)

    const body = await res.json()
    expect(Array.isArray(body.values)).toBe(true)
    expect(body.values.length).toBeGreaterThan(0)
    expect(body.values).toContain('PAKISTANI')
    expect(typeof body.labels).toBe('object')
    expect(body.labels['PAKISTANI']).toBe('Pakistani')
  })

  test('GET /api/v1/chefs/meta/occasion-tags returns 200 with occasion tags', async ({ request }) => {
    const res = await request.get(`${CHEF_SERVICE_URL}/api/v1/chefs/meta/occasion-tags`)
    expect(res.status()).toBe(200)

    const body = await res.json()
    expect(Array.isArray(body.values)).toBe(true)
    expect(body.values.length).toBeGreaterThan(0)
    expect(typeof body.labels).toBe('object')
  })

  test('GET /api/v1/chefs/meta/dietary-tags returns 200 with dietary tags', async ({ request }) => {
    const res = await request.get(`${CHEF_SERVICE_URL}/api/v1/chefs/meta/dietary-tags`)
    expect(res.status()).toBe(200)

    const body = await res.json()
    expect(Array.isArray(body.values)).toBe(true)
    expect(body.values).toContain('HALAL')
    expect(typeof body.labels).toBe('object')
  })

  test('GET /api/v1/chefs/meta/allergens returns 200 with allergen values and labels', async ({ request }) => {
    const res = await request.get(`${CHEF_SERVICE_URL}/api/v1/chefs/meta/allergens`)
    expect(res.status()).toBe(200)

    const body = await res.json()
    expect(Array.isArray(body.values)).toBe(true)
    expect(body.values.length).toBeGreaterThan(0)
    expect(typeof body.labels).toBe('object')
  })
})
