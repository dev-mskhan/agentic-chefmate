import { test, expect } from '@playwright/test'
import { AuthEventsCapture } from '../../helpers/auth-events'
import { uniqueEmail, STRONG_PASSWORD, signup, trpcPost } from '../../helpers/auth'

/**
 * Email-verification flow.
 *
 * signup creates a one-time verification token in Redis and publishes a
 * `user.registered` event whose verifyUrl contains the raw token. We capture
 * it via a real Kafka consumer (same topic notification-service consumes),
 * then call verifyEmail with the token.
 */

test.describe('Phase 1 — Email Verification (via Kafka-captured token)', () => {
  let capture: AuthEventsCapture

  test.beforeAll(async () => {
    capture = new AuthEventsCapture()
    await capture.start()
    // Give the consumer a moment to join the group and assign partitions.
    await new Promise((r) => setTimeout(r, 2000))
  })

  test.afterAll(async () => {
    await capture.stop()
  })

  test('1. verifyEmail — 200 with a valid token from user.registered event', async ({ request }) => {
    const email = uniqueEmail('verify')
    await signup(request, email)

    const token = await capture.waitForVerifyToken(email)
    expect(token).toBeTruthy()

    const { status, data, error } = await trpcPost(request, 'verifyEmail', { token })
    expect(status).toBe(200)
    expect(data.verified).toBe(true)
    expect(data.email).toBe(email)
  })

  test('2. verifyEmail with an invalid token — 401', async ({ request }) => {
    const { status, error } = await trpcPost(request, 'verifyEmail', {
      token: 'deadbeefinvalidtoken',
    })
    expect(status).toBe(401)
    expect(error.data.httpStatus).toBe(401)
    expect(error.message).toMatch(/invalid or expired/i)
  })

  test('3. verifyEmail is one-time — replaying a used token returns 401', async ({ request }) => {
    const email = uniqueEmail('verify-onetime')
    await signup(request, email)
    const token = await capture.waitForVerifyToken(email)

    const first = await trpcPost(request, 'verifyEmail', { token })
    expect(first.status).toBe(200)

    const second = await trpcPost(request, 'verifyEmail', { token })
    expect(second.status).toBe(401)
  })

  test('4. resendVerification — 200, emits a new user.registered event', async ({ request }) => {
    const email = uniqueEmail('resend')
    await signup(request, email)
    // consume + discard the first token
    await capture.waitForVerifyToken(email)

    const { status, data } = await trpcPost(request, 'resendVerification', { email })
    expect(status).toBe(200)
    expect(data.success).toBe(true)

    // A NEW token should arrive (different from the first).
    const token2 = await capture.waitForVerifyToken(email)
    expect(token2).toBeTruthy()

    // The new token must verify the email.
    const verify = await trpcPost(request, 'verifyEmail', { token: token2 })
    expect(verify.status).toBe(200)
  })

  test('5. resendVerification for unknown email — 200 (no enumeration)', async ({ request }) => {
    const { status, data } = await trpcPost(request, 'resendVerification', {
      email: uniqueEmail('unknown'),
    })
    expect(status).toBe(200)
    expect(data.success).toBe(true)
  })
})
