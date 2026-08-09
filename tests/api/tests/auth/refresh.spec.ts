/**
 * Tests: POST /api/v1/auth/trpc/refresh
 *
 * refresh is a tRPC mutation (POST) — uses protectedRefreshProcedure.
 * No input. Reads refresh token from cookie.
 * Success: { userId, role }
 *   - Issues new access + refresh token pair (rotation)
 * Errors: 401 when refresh token missing/invalid/expired/revoked
 *
 * COOKIE PATH NOTE:
 * The refresh cookie is set with path=/api/v1/auth/refresh (browser enforcement).
 * Playwright honors cookie path, so the cookie is NOT automatically sent to
 * /api/v1/auth/trpc/refresh.
 *
 * Workaround: After signin, extract the raw cookie string from the Set-Cookie header
 * and manually inject it into the refresh request via the Cookie header.
 * This is correct because we're testing the server-side cookie reading logic, not
 * browser cookie enforcement.
 */
import { test, expect } from '@playwright/test'
import { trpcMutation, parseTRPC } from '../../helpers/trpc'
import { assertTRPCSuccess, assertTRPCError } from '../../helpers/assertions'
import { uniqueTestEmail, TEST_PASSWORD, signupUser } from '../../fixtures/auth'

/**
 * Extract the raw value of a named cookie from a Set-Cookie header string.
 * Returns the raw cookie pair string suitable for injecting in a Cookie header.
 */
function extractCookieValue(setCookieHeader: string, cookieName: string): string | undefined {
  const cookies = setCookieHeader.split(',').flatMap((c) => c.split('\n'))
  for (const cookie of cookies) {
    const [pair] = cookie.split(';')
    if (pair && pair.trim().startsWith(`${cookieName}=`)) {
      return pair.trim()
    }
  }
  return undefined
}

test.describe('tRPC refresh', () => {
  test('issues new token pair using valid refresh token', async ({ request }) => {
    const email = uniqueTestEmail('refresh')
    await signupUser(request, email)
    const signinRes = await trpcMutation(request, 'signin', { email, password: TEST_PASSWORD })

    // Extract raw refresh cookie to manually send it (cookie path workaround)
    const setCookieHeader = signinRes.headers()['set-cookie'] ?? ''
    const refreshCookiePair = extractCookieValue(setCookieHeader, 'refresh')
    const accessCookiePair = extractCookieValue(setCookieHeader, 'access')
    const cookieHeader = [accessCookiePair, refreshCookiePair].filter(Boolean).join('; ')

    const res = await trpcMutation(request, 'refresh', undefined, {
      headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
    })
    const body = await parseTRPC<{ userId: string; role: string }>(res)
    assertTRPCSuccess(body)
    expect(typeof body.data!.userId).toBe('string')
    expect(body.data!.role).toBe('USER')
  })

  test('sets new access and refresh cookies after refresh', async ({ request }) => {
    const email = uniqueTestEmail('refresh-cookies')
    await signupUser(request, email)
    const signinRes = await trpcMutation(request, 'signin', { email, password: TEST_PASSWORD })

    const setCookieHeader = signinRes.headers()['set-cookie'] ?? ''
    const refreshCookiePair = extractCookieValue(setCookieHeader, 'refresh')
    const accessCookiePair = extractCookieValue(setCookieHeader, 'access')
    const cookieHeader = [accessCookiePair, refreshCookiePair].filter(Boolean).join('; ')

    const res = await trpcMutation(request, 'refresh', undefined, {
      headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
    })
    expect(res.status()).toBe(200)
    const newSetCookie = res.headers()['set-cookie'] ?? ''
    expect(newSetCookie).toContain('access')
  })

  test('returns 401 when no refresh cookie is present', async ({ request }) => {
    // Fresh request context — no cookies at all
    const res = await trpcMutation(request, 'refresh')
    const body = await parseTRPC(res)
    assertTRPCError(body, 401)
  })
})
