/**
 * Tests: POST /api/v1/auth/trpc/resendVerification
 *
 * resendVerification is a tRPC mutation (POST).
 * Input: { email: string }
 * Success: { success: true }
 *   - Always returns success to prevent user enumeration
 *   - Re-creates email verification token in Redis and re-publishes event
 */
import { test, expect } from '@playwright/test'
import { trpcMutation, parseTRPC } from '../../helpers/trpc'
import { assertTRPCSuccess, assertTRPCError } from '../../helpers/assertions'
import { uniqueTestEmail, signupUser } from '../../fixtures/auth'

test.describe('tRPC resendVerification', () => {
  test('returns success for an existing unverified user', async ({ request }) => {
    const email = uniqueTestEmail('resend')
    await signupUser(request, email)

    const res = await trpcMutation(request, 'resendVerification', { email })
    const body = await parseTRPC<{ success: boolean }>(res)
    assertTRPCSuccess(body)
    expect(body.data!.success).toBe(true)
  })

  test('returns success even for non-existent email (prevents enumeration)', async ({ request }) => {
    const res = await trpcMutation(request, 'resendVerification', {
      email: 'no-such-user@chefmate.test',
    })
    const body = await parseTRPC<{ success: boolean }>(res)
    assertTRPCSuccess(body)
    expect(body.data!.success).toBe(true)
  })

  test('returns 400 when email is missing', async ({ request }) => {
    const res = await trpcMutation(request, 'resendVerification', {})
    const body = await parseTRPC(res)
    assertTRPCError(body, 400)
  })

  test('returns 400 when email is invalid format', async ({ request }) => {
    const res = await trpcMutation(request, 'resendVerification', { email: 'not-an-email' })
    const body = await parseTRPC(res)
    assertTRPCError(body, 400)
  })
})
