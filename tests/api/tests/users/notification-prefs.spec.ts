import { test, expect } from '@playwright/test'
import {
  setupUser,
  utrpcPost,
  utrpcGet,
  errorHttpStatus,
} from '../../helpers/user'

/**
 * Phase 2 — User Service: Notification Preferences (via Gateway)
 * Covers: channels, categories, quiet hours, HH:MM regex validation,
 * partial updates (only specified fields change), get reflects update.
 */

test.describe('Phase 2 — Notification Preferences (via Gateway)', () => {

  test('1. updateNotifPrefs + getNotifPrefs reflect changes', async ({ request }) => {
    await setupUser(request)
    const upd = await utrpcPost(request, 'updateNotifPrefs', {
      channels: { push: true, email: true, sms: false, inApp: true },
      categories: { orderUpdates: true, chefMessages: true, promotions: false },
      quietHours: { enabled: true, start: '22:00', end: '07:00' },
    })
    expect(upd.status).toBe(200)
    expect(upd.data.channels.push).toBe(true)
    expect(upd.data.channels.sms).toBe(false)
    expect(upd.data.categories.promotions).toBe(false)
    expect(upd.data.quietHours.enabled).toBe(true)

    const get = await utrpcGet(request, 'getNotifPrefs')
    expect(get.status).toBe(200)
    expect(get.data.channels.push).toBe(true)
    expect(get.data.channels.sms).toBe(false)
    expect(get.data.quietHours.start).toBe('22:00')
  })

  test('2. Partial update — only specified channel fields change', async ({ request }) => {
    await setupUser(request)
    // Set a baseline
    await utrpcPost(request, 'updateNotifPrefs', {
      channels: { push: true, email: true, sms: true, inApp: true },
    })
    // Partial: only flip sms
    await utrpcPost(request, 'updateNotifPrefs', {
      channels: { sms: false },
    })
    const get = await utrpcGet(request, 'getNotifPrefs')
    expect(get.data.channels.sms).toBe(false)
    // Others unchanged
    expect(get.data.channels.push).toBe(true)
    expect(get.data.channels.email).toBe(true)
    expect(get.data.channels.inApp).toBe(true)
  })

  test('3. quietHours rejects an invalid start time (not HH:MM) → 400', async ({ request }) => {
    await setupUser(request)
    const { status, error } = await utrpcPost(request, 'updateNotifPrefs', {
      quietHours: { enabled: true, start: '25:00', end: '07:00' },
    })
    expect(status).toBe(400)
    expect(errorHttpStatus(error, status)).toBe(400)
  })

  test('4. quietHours rejects an invalid end time → 400', async ({ request }) => {
    await setupUser(request)
    const { status, error } = await utrpcPost(request, 'updateNotifPrefs', {
      quietHours: { start: '22:00', end: '7am' },
    })
    expect(status).toBe(400)
    expect(errorHttpStatus(error, status)).toBe(400)
  })

  test('5. channels rejects a non-boolean → 400', async ({ request }) => {
    await setupUser(request)
    const { status, error } = await utrpcPost(request, 'updateNotifPrefs', {
      channels: { push: 'yes' as any },
    })
    expect(status).toBe(400)
    expect(errorHttpStatus(error, status)).toBe(400)
  })

  test('6. getNotifPrefs without a profile → 404 (or 200 with defaults if consumer ran)', async ({ request }) => {
    const email = `notif-noprofile-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@chefmate.test`
    await request.post('/api/v1/auth/trpc/signup', { data: { email, password: 'UserTest123!' } })
    const { status } = await utrpcGet(request, 'getNotifPrefs')
    expect([200, 404]).toContain(status)
  })
})
