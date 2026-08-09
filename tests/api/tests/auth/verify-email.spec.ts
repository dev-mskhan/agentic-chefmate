/**
 * Tests: POST /api/v1/auth/trpc/verifyEmail
 *
 * verifyEmail is a tRPC mutation (POST).
 * Input: { token: string }
 * Success: { verified: true, email: string }
 *
 * Note: The verification token is a Redis-stored one-time token sent via email
 * via the notification-service. In tests we cannot retrieve the actual token
 * from email delivery, so we test the error path and structural correctness.
 * Full integration flow (signup → receive email → verify) is an integration test concern.
 */
import { test } from '@playwright/test'
import { trpcMutation, parseTRPC } from '../../helpers/trpc'
import { assertTRPCError } from '../../helpers/assertions'

test.describe('tRPC verifyEmail', () => {
  test('returns 401 when token is invalid or expired', async ({ request }) => {
    const res = await trpcMutation(request, 'verifyEmail', { token: 'invalid-token-that-does-not-exist' })
    const body = await parseTRPC(res)
    assertTRPCError(body, 401)
  })

  test('returns 400 when token is missing', async ({ request }) => {
    const res = await trpcMutation(request, 'verifyEmail', {})
    const body = await parseTRPC(res)
    assertTRPCError(body, 400)
  })

  test('returns 400 when token is empty string', async ({ request }) => {
    const res = await trpcMutation(request, 'verifyEmail', { token: '' })
    const body = await parseTRPC(res)
    assertTRPCError(body, 400)
  })
})
