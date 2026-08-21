import { test, expect } from '@playwright/test'
import { setupActiveChef, chefPut, chefPost, chefPatch, chefGet } from '../../helpers/chef'

test.describe('Phase 3C - Schedule (via Gateway)', () => {
  test('1. Upsert weekly schedule', async ({ request }) => {
    await setupActiveChef(request)
    const res = await chefPut(request, '/me/schedule', { recurringDays: [{ dayOfWeek: 'MON', windows: [{ openTime: '10:00', closeTime: '14:00' }] }] })
    expect(res.status).toBe(200)
    expect(res.data.recurringDays.length).toBeGreaterThanOrEqual(1)
  })

  test('2. Add blackout date', async ({ request }) => {
    await setupActiveChef(request)
    // Schedule must exist first
    await chefPut(request, '/me/schedule', { recurringDays: [{ dayOfWeek: 'MON', windows: [{ openTime: '10:00', closeTime: '14:00' }] }] })
    const res = await chefPost(request, '/me/schedule/blackout', { date: '2026-12-25', reason: 'HOLIDAY' })
    expect(res.status).toBe(200)
  })

  test('3. Remove blackout date', async ({ request }) => {
    await setupActiveChef(request)
    await chefPut(request, '/me/schedule', { recurringDays: [{ dayOfWeek: 'MON', windows: [{ openTime: '10:00', closeTime: '14:00' }] }] })
    await chefPost(request, '/me/schedule/blackout', { date: '2026-12-26', reason: 'HOLIDAY' })
    const res = await request.delete('/api/v1/chefs/me/schedule/blackout/2026-12-26', { data: {} })
    expect(res.status()).toBe(200)
  })

  test('4. Add one-off date', async ({ request }) => {
    await setupActiveChef(request)
    await chefPut(request, '/me/schedule', { recurringDays: [{ dayOfWeek: 'MON', windows: [{ openTime: '10:00', closeTime: '14:00' }] }] })
    const res = await chefPost(request, '/me/schedule/one-off', { date: '2026-11-14', windows: [{ openTime: '12:00', closeTime: '18:00' }] })
    expect(res.status).toBe(200)
  })

  test('5. Remove one-off date', async ({ request }) => {
    await setupActiveChef(request)
    await chefPut(request, '/me/schedule', { recurringDays: [{ dayOfWeek: 'MON', windows: [{ openTime: '10:00', closeTime: '14:00' }] }] })
    await chefPost(request, '/me/schedule/one-off', { date: '2026-11-15', windows: [{ openTime: '12:00', closeTime: '18:00' }] })
    const res = await request.delete('/api/v1/chefs/me/schedule/one-off/2026-11-15')
    expect(res.status()).toBe(200)
  })

  test('6. Update capacity', async ({ request }) => {
    await setupActiveChef(request)
    // Schedule must exist first
    await chefPut(request, '/me/schedule', { recurringDays: [{ dayOfWeek: 'MON', windows: [{ openTime: '10:00', closeTime: '14:00' }] }] })
    const res = await chefPatch(request, '/me/schedule/capacity', { maxOrdersPerDay: 10, prepTimeMinutes: 60, leadTimeHours: 24 })
    expect(res.status).toBe(200)
  })

  test('7. Availability check - available date', async ({ request }) => {
    const s = await setupActiveChef(request)
    await chefPut(request, '/me/schedule', { recurringDays: [{ dayOfWeek: 'MON', windows: [{ openTime: '10:00', closeTime: '14:00' }] }] })
    const res = await chefGet(request, `/${s.chefId}/availability?date=2026-08-24`)
    expect(res.status).toBe(200)
    // canChefAcceptOrder returns { available, ... }
    expect(res.data).toHaveProperty('available')
  })

  test('8. Availability check - blackout date unavailable', async ({ request }) => {
    const s = await setupActiveChef(request)
    await chefPut(request, '/me/schedule', { recurringDays: [{ dayOfWeek: 'TUE', windows: [{ openTime: '10:00', closeTime: '14:00' }] }] })
    await chefPost(request, '/me/schedule/blackout', { date: '2026-08-25', reason: 'PERSONAL' })
    const res = await chefGet(request, `/${s.chefId}/availability?date=2026-08-25`)
    expect(res.status).toBe(200)
    expect(res.data.available).toBe(false)
  })

  test('9. Unauthenticated PUT schedule -> 401', async ({ request }) => {
    const res = await chefPut(request, '/me/schedule', { recurringDays: [] })
    expect(res.status).toBe(401)
  })

  test('10. Invalid time window (close before open) -> 400', async ({ request }) => {
    await setupActiveChef(request)
    const res = await chefPut(request, '/me/schedule', { recurringDays: [{ dayOfWeek: 'FRI', windows: [{ openTime: '20:00', closeTime: '10:00' }] }] })
    expect(res.status).toBe(400)
  })
})