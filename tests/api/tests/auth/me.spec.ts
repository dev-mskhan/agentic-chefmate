/**
 * Tests: GET /api/v1/auth/trpc/me
 *
 * me is a tRPC QUERY (GET) — uses protectedProcedure.
 * No input. Reads access token from cookie.
 * Success: { userId, email, role, emailVerified, hasGoogleAccount, createdAt, updatedAt }
 * Auth: requires valid access cookie
 */
import { test, expect } from '@playwright/test'
import { trpcQuery, parseTRPC } from '../../helpers/trpc'
import { assertTRPCSuccess, assertTRPCError } from '../../helpers/assertions'
import { createAndSigninUser } from '../../fixtures/auth'

test.describe('tRPC me (GET query)', () => {
  test('returns current user profile when authenticated', async ({ request }) => {
    const { email, userId } = await createAndSigninUser(request)
    const res = await trpcQuery(request, 'me')
    const body = await parseTRPC<{
      userId: string; email: string; role: string;
      emailVerified: boolean; hasGoogleAccount: boolean;
      createdAt: string; updatedAt: string
    }>(res)

    assertTRPCSuccess(body)
    expect(body.data!.userId).toBe(userId)
    expect(body.data!.email).toBe(email)
    expect(body.data!.role).toBe('USER')
    expect(typeof body.data!.emailVerified).toBe('boolean')
    expect(typeof body.data!.hasGoogleAccount).toBe('boolean')
  })

  test('me uses GET method (tRPC query transport)', async ({ request }) => {
    // Verify the endpoint responds to GET (not POST)
    await createAndSigninUser(request)
    const res = await trpcQuery(request, 'me')
    expect(res.status()).toBe(200)
  })

  test('returns 401 when not authenticated', async ({ request }) => {
    // No cookies present in fresh request context
    const res = await trpcQuery(request, 'me')
    const body = await parseTRPC(res)
    assertTRPCError(body, 401)
  })
})
