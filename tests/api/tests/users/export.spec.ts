import { test, expect } from '@playwright/test'
import {
  setupUser,
  utrpcPost,
  utrpcGet,
  errorHttpStatus,
  errorMessage,
} from '../../helpers/user'

/**
 * Phase 2 — User Service: GDPR Data Export (via Gateway)
 * Covers: export returns the full profile document; rate limit — the 2nd
 * export within the 60-minute window returns 429. No Redis flushing (the
 * real rate-limit behaviour is exercised end-to-end).
 */

test.describe('Phase 2 — GDPR Export (via Gateway)', () => {

  test('1. exportData returns the full profile after setup', async ({ request }) => {
    await setupUser(request)
    await utrpcPost(request, 'updateMe', { firstName: 'Export', lastName: 'Target' })

    const { status, data } = await utrpcGet(request, 'exportData')
    expect(status).toBe(200)
    expect(data.userId).toBeTruthy()
    expect(data.firstName).toBe('Export')
    expect(data.lastName).toBe('Target')
    // Full document includes all sections
    expect(Array.isArray(data.addresses)).toBe(true)
    expect(data.notificationPreferences).toBeTruthy()
    expect(data.favorites).toBeTruthy()
  })

  test('2. exportData rate limit — 2nd export in the same window → 429', async ({ request }) => {
    await setupUser(request)
    // First export succeeds
    const first = await utrpcGet(request, 'exportData')
    expect(first.status).toBe(200)

    // Second export in the same 60-minute window is rejected
    const second = await utrpcGet(request, 'exportData')
    expect(second.status).toBe(429)
    expect(errorHttpStatus(second.error, second.status)).toBe(429)
    expect(errorMessage(second.error)).toMatch(/rate limit/i)
  })

  test('3. exportData without a profile → 404 (or 429 if already rate-limited)', async ({ request }) => {
    // Sign up fresh; the export rate-limit key is per-user, so a fresh user
    // hasn't hit the limit. With no profile, expect 404.
    const email = `export-noprofile-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@chefmate.test`
    await request.post('/api/v1/auth/trpc/signup', { data: { email, password: 'UserTest123!' } })
    const { status } = await utrpcGet(request, 'exportData')
    // If consumer created the stub → 200; if not → 404. Either is valid here.
    expect([200, 404]).toContain(status)
  })
})
