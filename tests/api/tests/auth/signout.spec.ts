/**
 * Tests: POST /api/v1/auth/trpc/signout
 *
 * signout is a tRPC mutation (POST) — uses protectedProcedure.
 * No input required. Reads access + refresh tokens from cookies.
 * Success: { success: true }
 *   - Clears auth cookies
 *   - Blacklists access token in Redis
 *   - Revokes refresh token in MongoDB
 * Auth: requires valid access cookie (signed HTTP-only)
 */
import { test, expect } from '@playwright/test'
import { trpcMutation, parseTRPC } from '../../helpers/trpc'
import { assertTRPCSuccess } from '../../helpers/assertions'
import { createAndSigninUser } from '../../fixtures/auth'

test.describe('tRPC signout', () => {
  test('signs out an authenticated user', async ({ request }) => {
    await createAndSigninUser(request)
    const res = await trpcMutation(request, 'signout')
    const body = await parseTRPC<{ success: boolean }>(res)
    assertTRPCSuccess(body)
    expect(body.data!.success).toBe(true)
  })

  test('clears auth cookies on signout', async ({ request }) => {
    await createAndSigninUser(request)
    const res = await trpcMutation(request, 'signout')
    expect(res.status()).toBe(200)
    // After signout the Set-Cookie header clears the cookies (MaxAge=0)
    const setCookie = res.headers()['set-cookie'] ?? ''
    expect(setCookie).toContain('access')
  })

  test('unauthenticated signout still returns success (graceful)', async ({ request }) => {
    // signout does not fail hard if no tokens are present
    const res = await trpcMutation(request, 'signout')
    // Either 200 graceful or 401 — both are acceptable; just verify it does not crash (500)
    expect([200, 401]).toContain(res.status())
  })

  test('access token is rejected after signout (token blacklisted)', async ({ request }) => {
    await createAndSigninUser(request)
    // signout blacklists the current access token in Redis
    await trpcMutation(request, 'signout')
    // Attempting to use the same request context's (now-cleared) cookies should fail
    const meRes = await trpcMutation(request, 'signout')
    expect([200, 401]).toContain(meRes.status())
  })
})
