/**
 * Tests: POST /api/v1/auth/trpc/signup
 *
 * signup is a tRPC mutation (POST).
 * Input: { email: string, password: string }
 * Success: { userId, email, role }
 *   - Sets signed HTTP-only cookies: access + refresh
 * Errors: 409 on duplicate email, 400 on validation failure
 */
import { test, expect } from '@playwright/test'
import { trpcMutation, parseTRPC } from '../../helpers/trpc'
import { assertTRPCSuccess, assertTRPCError, assertCookieSet } from '../../helpers/assertions'
import { uniqueTestEmail, TEST_PASSWORD } from '../../fixtures/auth'

test.describe('tRPC signup', () => {
  test('registers a new user and returns userId/email/role', async ({ request }) => {
    const email = uniqueTestEmail('signup')
    const res = await trpcMutation(request, 'signup', { email, password: TEST_PASSWORD })
    const body = await parseTRPC<{ userId: string; email: string; role: string }>(res)

    assertTRPCSuccess(body)
    expect(body.data!.email).toBe(email)
    expect(body.data!.role).toBe('USER')
    expect(typeof body.data!.userId).toBe('string')
  })

  test('sets signed access and refresh cookies on successful signup', async ({ request }) => {
    const email = uniqueTestEmail('signup-cookies')
    const res = await trpcMutation(request, 'signup', { email, password: TEST_PASSWORD })
    expect(res.status()).toBe(200)
    assertCookieSet(res, 'access')
    assertCookieSet(res, 'refresh')
  })

  test('returns 409 on duplicate email', async ({ request }) => {
    const email = uniqueTestEmail('signup-dup')
    await trpcMutation(request, 'signup', { email, password: TEST_PASSWORD })
    const res = await trpcMutation(request, 'signup', { email, password: TEST_PASSWORD })
    const body = await parseTRPC(res)
    assertTRPCError(body, 409)
  })

  test('returns 400 when email is missing', async ({ request }) => {
    const res = await trpcMutation(request, 'signup', { password: TEST_PASSWORD })
    const body = await parseTRPC(res)
    assertTRPCError(body, 400)
  })

  test('returns 400 when password is missing', async ({ request }) => {
    const res = await trpcMutation(request, 'signup', { email: uniqueTestEmail() })
    const body = await parseTRPC(res)
    assertTRPCError(body, 400)
  })

  test('returns 400 when email is not a valid email address', async ({ request }) => {
    const res = await trpcMutation(request, 'signup', { email: 'not-an-email', password: TEST_PASSWORD })
    const body = await parseTRPC(res)
    assertTRPCError(body, 400)
  })

  test('returns 400 when password is too short (< 8 chars)', async ({ request }) => {
    const res = await trpcMutation(request, 'signup', { email: uniqueTestEmail(), password: 'Abc1' })
    const body = await parseTRPC(res)
    assertTRPCError(body, 400)
  })

  test('returns 400 when password has no uppercase letter', async ({ request }) => {
    const res = await trpcMutation(request, 'signup', { email: uniqueTestEmail(), password: 'testpass123' })
    const body = await parseTRPC(res)
    assertTRPCError(body, 400)
  })

  test('returns 400 when password has no lowercase letter', async ({ request }) => {
    const res = await trpcMutation(request, 'signup', { email: uniqueTestEmail(), password: 'TESTPASS123' })
    const body = await parseTRPC(res)
    assertTRPCError(body, 400)
  })

  test('returns 400 when password has no digit', async ({ request }) => {
    const res = await trpcMutation(request, 'signup', { email: uniqueTestEmail(), password: 'TestPassNoDigit' })
    const body = await parseTRPC(res)
    assertTRPCError(body, 400)
  })

  test('returns 400 when body is empty', async ({ request }) => {
    const res = await trpcMutation(request, 'signup', {})
    const body = await parseTRPC(res)
    assertTRPCError(body, 400)
  })

  test('returns 400 when password exceeds 128 chars', async ({ request }) => {
    const longPassword = 'Aa1' + 'x'.repeat(130)
    const res = await trpcMutation(request, 'signup', { email: uniqueTestEmail(), password: longPassword })
    const body = await parseTRPC(res)
    assertTRPCError(body, 400)
  })
})
