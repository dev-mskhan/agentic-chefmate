/**
 * Tests: POST /api/v1/auth/trpc/signin
 *
 * signin is a tRPC mutation (POST).
 * Input: { email: string, password: string }
 * Success: { userId, email, role }
 *   - Sets signed HTTP-only cookies: access + refresh
 * Errors: 401 on bad credentials, 429 on rate limit, 400 on validation
 */
import { test, expect } from '@playwright/test'
import { trpcMutation, parseTRPC } from '../../helpers/trpc'
import { assertTRPCSuccess, assertTRPCError, assertCookieSet } from '../../helpers/assertions'
import { uniqueTestEmail, TEST_PASSWORD, signupUser } from '../../fixtures/auth'

test.describe('tRPC signin', () => {
  test('signs in an existing user and returns userId/email/role', async ({ request }) => {
    const email = uniqueTestEmail('signin')
    await signupUser(request, email)

    const res = await trpcMutation(request, 'signin', { email, password: TEST_PASSWORD })
    const body = await parseTRPC<{ userId: string; email: string; role: string }>(res)

    assertTRPCSuccess(body)
    expect(body.data!.email).toBe(email)
    expect(body.data!.role).toBe('USER')
    expect(typeof body.data!.userId).toBe('string')
  })

  test('sets signed access and refresh cookies on successful signin', async ({ request }) => {
    const email = uniqueTestEmail('signin-cookies')
    await signupUser(request, email)

    const res = await trpcMutation(request, 'signin', { email, password: TEST_PASSWORD })
    expect(res.status()).toBe(200)
    assertCookieSet(res, 'access')
    assertCookieSet(res, 'refresh')
  })

  test('returns 401 when user does not exist', async ({ request }) => {
    const res = await trpcMutation(request, 'signin', {
      email: 'nonexistent@chefmate.test',
      password: TEST_PASSWORD,
    })
    const body = await parseTRPC(res)
    assertTRPCError(body, 401)
  })

  test('returns 401 when password is wrong', async ({ request }) => {
    const email = uniqueTestEmail('signin-badpass')
    await signupUser(request, email)

    const res = await trpcMutation(request, 'signin', { email, password: 'WrongPass999!' })
    const body = await parseTRPC(res)
    assertTRPCError(body, 401)
  })

  test('returns 400 when email is missing', async ({ request }) => {
    const res = await trpcMutation(request, 'signin', { password: TEST_PASSWORD })
    const body = await parseTRPC(res)
    assertTRPCError(body, 400)
  })

  test('returns 400 when password is missing', async ({ request }) => {
    const res = await trpcMutation(request, 'signin', { email: 'test@chefmate.test' })
    const body = await parseTRPC(res)
    assertTRPCError(body, 400)
  })

  test('returns 400 when email is invalid format', async ({ request }) => {
    const res = await trpcMutation(request, 'signin', { email: 'not-an-email', password: TEST_PASSWORD })
    const body = await parseTRPC(res)
    assertTRPCError(body, 400)
  })

  test('returns 400 when body is empty', async ({ request }) => {
    const res = await trpcMutation(request, 'signin', {})
    const body = await parseTRPC(res)
    assertTRPCError(body, 400)
  })

  test('signin is case-insensitive for email', async ({ request }) => {
    const email = uniqueTestEmail('signin-case')
    await signupUser(request, email)

    const res = await trpcMutation(request, 'signin', { email: email.toUpperCase(), password: TEST_PASSWORD })
    const body = await parseTRPC<{ userId: string; email: string; role: string }>(res)
    assertTRPCSuccess(body)
  })
})
