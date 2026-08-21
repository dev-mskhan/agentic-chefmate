import { test, expect } from '@playwright/test'
import { AuthEventsCapture } from '../../helpers/auth-events'
import { uniqueEmail, STRONG_PASSWORD, signup, signin, trpcPost } from '../../helpers/auth'

/**
 * Forgot-password / reset-password flow.
 *
 * forgotPassword publishes a `user.password_reset_requested` event whose
 * resetUrl contains the raw one-time reset token. We capture it via a real
 * Kafka consumer, then call resetPassword with the token + a new password.
 */

const NEW_PASSWORD = 'NewResetPass456!'

test.describe('Phase 1 — Forgot / Reset Password (via Kafka-captured token)', () => {
  let capture: AuthEventsCapture

  test.beforeAll(async () => {
    capture = new AuthEventsCapture()
    await capture.start()
    await new Promise((r) => setTimeout(r, 2000))
  })

  test.afterAll(async () => {
    await capture.stop()
  })

  test('1. forgotPassword + resetPassword — 200, can signin with new password', async ({ request }) => {
    const email = uniqueEmail('reset')
    await signup(request, email)

    const forgot = await trpcPost(request, 'forgotPassword', { email })
    expect(forgot.status).toBe(200)
    expect(forgot.data.success).toBe(true)

    const token = await capture.waitForResetToken(email)
    expect(token).toBeTruthy()

    const reset = await trpcPost(request, 'resetPassword', {
      token,
      newPassword: NEW_PASSWORD,
    })
    expect(reset.status).toBe(200)
    expect(reset.data.success).toBe(true)

    // Old password should no longer work.
    const oldSignin = await signin(request, email, STRONG_PASSWORD)
    expect(oldSignin.status).toBe(401)

    // New password works.
    const newSignin = await signin(request, email, NEW_PASSWORD)
    expect(newSignin.status).toBe(200)
  })

  test('2. resetPassword with an invalid token — 401', async ({ request }) => {
    const { status, error } = await trpcPost(request, 'resetPassword', {
      token: 'deadbeefinvalidresettoken',
      newPassword: NEW_PASSWORD,
    })
    expect(status).toBe(401)
    expect(error.data.httpStatus).toBe(401)
    expect(error.message).toMatch(/invalid or expired/i)
  })

  test('3. resetPassword token is one-time — replay returns 401', async ({ request }) => {
    const email = uniqueEmail('reset-onetime')
    await signup(request, email)

    await trpcPost(request, 'forgotPassword', { email })
    const token = await capture.waitForResetToken(email)

    const first = await trpcPost(request, 'resetPassword', {
      token,
      newPassword: NEW_PASSWORD,
    })
    expect(first.status).toBe(200)

    const second = await trpcPost(request, 'resetPassword', {
      token,
      newPassword: 'AnotherPass789!',
    })
    expect(second.status).toBe(401)
  })

  test('4. forgotPassword for unknown email — 200 (no enumeration)', async ({ request }) => {
    const { status, data } = await trpcPost(request, 'forgotPassword', {
      email: uniqueEmail('unknown'),
    })
    expect(status).toBe(200)
    expect(data.success).toBe(true)
  })

  test('5. resetPassword rejects a weak password — 400 validation', async ({ request }) => {
    const email = uniqueEmail('reset-weak')
    await signup(request, email)
    await trpcPost(request, 'forgotPassword', { email })
    const token = await capture.waitForResetToken(email)

    const { status, error } = await trpcPost(request, 'resetPassword', {
      token,
      newPassword: 'weak',
    })
    expect(status).toBe(400)
    expect(error.message).toMatch(/validation failed/i)
  })
})
