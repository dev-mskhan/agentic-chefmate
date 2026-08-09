/**
 * Tests: GET /api/v1/auth/.well-known/jwks.json
 *
 * REST endpoint — returns the RS256 public key in JWK format.
 * Used by the gateway to verify access tokens without calling auth-service per request.
 * No authentication required.
 */
import { test, expect } from '@playwright/test'
import { assertStatus } from '../../helpers/assertions'

test.describe('REST GET /api/v1/auth/.well-known/jwks.json', () => {
  test('returns a valid JWK set with at least one RS256 key', async ({ request }) => {
    const res = await request.get('/api/v1/auth/.well-known/jwks.json')
    const body = await assertStatus<{ keys: unknown[] }>(res, 200)

    expect(Array.isArray(body.keys)).toBe(true)
    expect(body.keys.length).toBeGreaterThan(0)

    const key = body.keys[0] as Record<string, unknown>
    expect(key['kty']).toBe('RSA')
    expect(key['use']).toBe('sig')
    expect(key['alg']).toBe('RS256')
    expect(typeof key['n']).toBe('string')
    expect(typeof key['e']).toBe('string')
    expect(typeof key['kid']).toBe('string')
  })

  test('returns 200 with JSON content-type', async ({ request }) => {
    const res = await request.get('/api/v1/auth/.well-known/jwks.json')
    expect(res.status()).toBe(200)
    expect(res.headers()['content-type']).toContain('application/json')
  })
})
