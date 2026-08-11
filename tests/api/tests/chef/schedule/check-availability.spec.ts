/**
 * API Tests: checkChefAvailability (Phase 5)
 * GET /trpc/checkChefAvailability
 */
import { test, expect } from '@playwright/test'
import {
  chefTrpcMutation,
  chefTrpcQuery,
  parseTRPC,
  createChefAuthHeaders,
  fakeUserAuthHeaders,
} from '../../../fixtures/chef'
import { assertTRPCSuccess } from '../../../helpers/assertions'

const AUTH_URL = process.env['AUTH_SERVICE_URL'] ?? 'http://localhost:3001'

function futureDateStr(daysAhead = 7): string {
  const d = new Date()
  d.setDate(d.getDate() + daysAhead)
  return d.toISOString().slice(0, 10)
}

function dayName(daysAhead = 7): string {
  const d = new Date()
  d.setDate(d.getDate() + daysAhead)
  return ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][d.getDay()]!
}

test.describe('tRPC checkChefAvailability', () => {
  test('returns available:false when chef has no schedule', async ({ request }) => {
    const chefHeaders = await createChefAuthHeaders(request, AUTH_URL, 'avail-no-sched')
    const profileRes = await chefTrpcMutation(
      request, 'createChefProfile', { displayName: 'Chef NoSched' }, chefHeaders,
    )
    const profileBody = await parseTRPC<{ _id: string }>(profileRes)
    assertTRPCSuccess(profileBody)
    const chefId = (profileBody.data as any)._id as string

    const userHeaders = fakeUserAuthHeaders()
    const res = await chefTrpcQuery(request, 'checkChefAvailability', {
      chefId,
      date: futureDateStr(7),
    }, userHeaders)
    const body = await parseTRPC<{ available: boolean; reason?: string }>(res)
    assertTRPCSuccess(body)
    expect(body.data!.available).toBe(false)
  })

  test('returns available:false for a blackout date', async ({ request }) => {
    const chefHeaders = await createChefAuthHeaders(request, AUTH_URL, 'avail-blackout')
    const profileRes = await chefTrpcMutation(
      request, 'createChefProfile', { displayName: 'Chef Blackout' }, chefHeaders,
    )
    const profileBody = await parseTRPC<{ _id: string }>(profileRes)
    assertTRPCSuccess(profileBody)
    const chefId = (profileBody.data as any)._id as string

    const targetDate = futureDateStr(10)
    const targetDow = dayName(10)

    // Set up schedule with the target day
    await chefTrpcMutation(request, 'upsertChefSchedule', {
      recurringDays: [{ dayOfWeek: targetDow, windows: [], isActive: true }],
      capacity: { maxOrdersPerDay: 5, leadTimeHours: 1, prepTimeMinutes: 30 },
    }, chefHeaders)

    // Add blackout on target date
    await chefTrpcMutation(request, 'addBlackoutDate', {
      date: targetDate,
      reason: 'VACATION',
    }, chefHeaders)

    const userHeaders = fakeUserAuthHeaders()
    const res = await chefTrpcQuery(request, 'checkChefAvailability', {
      chefId,
      date: targetDate,
    }, userHeaders)
    const body = await parseTRPC<{ available: boolean; reason?: string }>(res)
    assertTRPCSuccess(body)
    expect(body.data!.available).toBe(false)
    expect(body.data!.reason).toContain('Blackout')
  })

  test('returns 401 without auth headers', async ({ request }) => {
    const res = await chefTrpcQuery(request, 'checkChefAvailability', {
      chefId: '000000000000000000000001',
      date: futureDateStr(7),
    })
    const body = await parseTRPC(res)
    expect(body.success).toBe(false)
  })
})
