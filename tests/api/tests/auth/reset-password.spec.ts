/**
 * Tests: POST /api/v1/auth/trpc/resetPassword
 *
 * resetPassword is a tRPC mutation (POST).
 * Input: { token: string, newPassword: string }
 * Success: { success: true }
 *
 * Note: The reset token is a Redis one-time token delivered via email.
 * Full flow tests (forgotPassword → retrieve token → resetPassword) are
 * integration test concerns. Here we test the error paths.
 */
import { test } from '@playwright/test'
import { trpcMutation, parseTRPC } from '../../helpers/trpc'
import { assertTRPCError } from '../../helpers/assertions'

const VALID_NEW_PASSWORD = 'NewTestPass456!'

test.describe('tRPC resetPassword', () => {
  test('returns 401 when token is invalid or expired', async ({ request }) => {
    const res = await trpcMutation(request, 'resetPassword', {
      token: 'invalid-token',
      newPassword: VALID_NEW_PASSWORD,
    })
    const body = await parseTRPC(res)
    assertTRPCError(body, 401)
  })

  test('returns 400 when token is missing', async ({ request }) => {
    const res = await trpcMutation(request, 'resetPassword', { newPassword: VALID_NEW_PASSWORD })
    const body = await parseTRPC(res)
    assertTRPCError(body, 400)
  })

  test('returns 400 when newPassword is missing', async ({ request }) => {
    const res = await trpcMutation(request, 'resetPassword', { token: 'some-token' })
    const body = await parseTRPC(res)
    assertTRPCError(body, 400)
  })

  test('returns 400 when newPassword fails strength requirements', async ({ request }) => {
    const res = await trpcMutation(request, 'resetPassword', { token: 'some-token', newPassword: 'weak' })
    const body = await parseTRPC(res)
    assertTRPCError(body, 400)
  })

  test('returns 400 when body is empty', async ({ request }) => {
    const res = await trpcMutation(request, 'resetPassword', {})
    const body = await parseTRPC(res)
    assertTRPCError(body, 400)
  })
})
