/**
 * Tests: Gateway authentication and authorization enforcement
 *
 * The gateway uses signed HTTP-only cookies (access / __Host-access).
 * Protected routes: /api/v1/users, /api/v1/chefs, /api/v1/orders, /api/v1/admin, /api/v1/notifications
 * Public route: /api/v1/auth (proxied directly, no gateway auth check)
 *
 * Auth flow:
 *   1. Gateway reads signed cookie
 *   2. Unsigns it (COOKIE_SECRET)
 *   3. Verifies RS256 JWT against JWKS from auth-service
 *   4. Checks Redis blacklist
 *   5. Checks role against allowedRoles
 *   6. Injects x-user-id, x-user-role, x-user-email headers
 */
import { test, expect } from '@playwright/test'
import { assertStatus } from '../../helpers/assertions'

const PROTECTED_ROUTES = [
  '/api/v1/users',
  '/api/v1/chefs',
  '/api/v1/orders',
  '/api/v1/notifications',
]

test.describe('Gateway auth enforcement', () => {
  test.describe('unauthenticated requests are rejected on protected routes', () => {
    for (const route of PROTECTED_ROUTES) {
      test(`GET ${route} returns 401 without auth cookie`, async ({ request }) => {
        const res = await request.get(route)
        expect(res.status()).toBe(401)
      })

      test(`POST ${route} returns 401 without auth cookie`, async ({ request }) => {
        const res = await request.post(route, { data: {} })
        expect(res.status()).toBe(401)
      })
    }
  })

  test('GET /api/v1/admin returns 401 without auth cookie', async ({ request }) => {
    const res = await request.get('/api/v1/admin')
    expect(res.status()).toBe(401)
  })

  test('invalid cookie signature returns 401', async ({ request }) => {
    const res = await request.get('/api/v1/users', {
      headers: {
        Cookie: 'access=s:fakejwt.invalidsignature',
      },
    })
    expect(res.status()).toBe(401)
  })

  test('malformed bearer token in cookie returns 401', async ({ request }) => {
    const res = await request.get('/api/v1/users', {
      headers: {
        Cookie: 'access=not-a-jwt-at-all',
      },
    })
    expect(res.status()).toBe(401)
  })

  test('unknown route returns 404', async ({ request }) => {
    const res = await request.get('/api/v1/this-route-does-not-exist-at-all')
    // Gateway may 404 or 502 depending on whether a service is up
    expect([404, 502, 503]).toContain(res.status())
  })

  test('/api/v1/auth is proxied without gateway auth check', async ({ request }) => {
    // auth endpoint should reach auth-service (not blocked by gateway auth)
    const res = await request.get('/api/v1/auth/.well-known/jwks.json')
    // Should get through to auth-service and return 200 or at worst a service error (not 401)
    expect(res.status()).not.toBe(401)
  })
})