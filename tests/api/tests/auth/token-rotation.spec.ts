import { test, expect } from '@playwright/test'
import { uniqueEmail, STRONG_PASSWORD, TRPC_PREFIX, signup } from '../../helpers/auth'

/**
 * Refresh-token rotation & reuse-detection tests.
 *
 * The refresh cookie is scoped to path /api/v1/auth so it IS sent on
 * /api/v1/auth/trpc/refresh (and signout). The auth-service refresh
 * procedure implements:
 *   - rotation: old refresh token is revoked, a new pair is issued
 *   - reuse detection: if a revoked token is presented again, the entire
 *     token family is revoked and the request is rejected with 401
 */

test.describe('Phase 1 — Refresh Token Rotation & Reuse Detection', () => {
  test('1. Refresh — 200, issues a new token pair (rotation)', async ({ request }) => {
    const email = uniqueEmail('refresh')
    await signup(request, email)

    // Grab the refresh cookie that signup set (path-scoped to /api/v1/auth).
    const cookies = await request.storageState()
    const refreshCookie = cookies.cookies.find(
      (c) => c.name === 'refresh' && c.path === '/api/v1/auth',
    )
    expect(refreshCookie).toBeTruthy()
    const originalRefresh = refreshCookie!.value

    // Call refresh through the gateway. The browser cookie jar sends the
    // refresh cookie automatically because the URL is under /api/v1/auth.
    const res = await request.post(`${TRPC_PREFIX}/refresh`, { data: {} })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.result.data.userId).toBeTruthy()
    expect(body.result.data.role).toBe('USER')

    // After rotation, a NEW refresh cookie should be set (different value).
    const cookies2 = await request.storageState()
    const newRefreshCookie = cookies2.cookies.find(
      (c) => c.name === 'refresh' && c.path === '/api/v1/auth',
    )
    expect(newRefreshCookie).toBeTruthy()
    expect(newRefreshCookie!.value).not.toBe(originalRefresh)
  })

  test('2. Token reuse detection — old refresh token invalidates the family', async ({ request }) => {
    const email = uniqueEmail('reuse')
    await signup(request, email)

    // Capture the original refresh token.
    const c1 = await request.storageState()
    const originalRefresh = c1.cookies.find(
      (c) => c.name === 'refresh' && c.path === '/api/v1/auth',
    )!.value

    // Rotate once — this revokes the original token.
    const res1 = await request.post(`${TRPC_PREFIX}/refresh`, { data: {} })
    expect(res1.status()).toBe(200)

    // Now replay the ORIGINAL (now-revoked) refresh token. The auth-service
    // should detect reuse, revoke the whole family, and return 401.
    // We must send the old cookie explicitly because the jar now holds the
    // rotated token.
    const res2 = await request.post(`${TRPC_PREFIX}/refresh`, {
      data: {},
      headers: { Cookie: `refresh=${originalRefresh}` },
    })
    expect(res2.status()).toBe(401)
    const body2 = await res2.json()
    expect(body2.error.data.httpStatus).toBe(401)
    expect(body2.error.message).toMatch(/reuse detected/i)

    // The rotated token must now ALSO be invalid (family revoked).
    const c2 = await request.storageState()
    const rotatedRefresh = c2.cookies.find(
      (c) => c.name === 'refresh' && c.path === '/api/v1/auth',
    )!.value
    const res3 = await request.post(`${TRPC_PREFIX}/refresh`, {
      data: {},
      headers: { Cookie: `refresh=${rotatedRefresh}` },
    })
    expect(res3.status()).toBe(401)
  })

  test('3. Refresh without a refresh cookie — 401', async ({ request }) => {
    // A fresh context with no refresh cookie.
    const res = await request.post(`${TRPC_PREFIX}/refresh`, { data: {} })
    expect(res.status()).toBe(401)
  })
})
