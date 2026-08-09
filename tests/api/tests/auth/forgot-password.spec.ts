/**
 * Tests: POST /api/v1/auth/trpc/forgotPassword
 *
 * forgotPassword is a tRPC mutation (POST).
 * Input: { email: string }
 * Success: { success: true }
 *   - Always returns success to prevent user enumeration
 *   - Creates a password reset token in Redis (TTL 10 min) and publishes event
 */
import { test, expect } from '@playwright/test'
import { trpcMutation, parseTRPC } from '../../helpers/trpc'
import { assertTRPCSuccess, assertTRPCError } from '../../helpers/assertions'
import { uniqueTestEmail, signupUser } from '../../fixtures/auth'

test.describe('tRPC forgotPassword', () => {
  test('returns success for an existing user', async ({ request }) => {
    const email = uniqueTestEmail('forgot')
    await signupUser(request, email)

    const res = await trpcMutation(request, 'forgotPassword', { email })
    const body = await parseTRPC<{ success: boolean }>(res)
    assertTRPCSuccess(body)
    expect(body.data!.success).toBe(true)
  })

  test('returns success even for non-existent email (prevents enumeration)', async ({ request }) => {
    const res = await trpcMutation(request, 'forgotPassword', { email: 'ghost@chefmate.test' })
    const body = await parseTRPC<{ success: boolean }>(res)
    assertTRPCSuccess(body)
    expect(body.data!.success).toBe(true)
  })

  test('returns 400 when email is missing', async ({ request }) => {
    const res = await trpcMutation(request, 'forgotPassword', {})
    const body = await parseTRPC(res)
    assertTRPCError(body, 400)
  })

  test('returns 400 when email is invalid format', async ({ request }) => {
    const res = await trpcMutation(request, 'forgotPassword', { email: 'invalid' })
    const body = await parseTRPC(res)
    assertTRPCError(body, 400)
  })
})
