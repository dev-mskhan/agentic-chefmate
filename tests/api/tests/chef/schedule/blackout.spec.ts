/**
 * API Tests: blackout date management (Phase 5)
 */
import { test, expect } from '@playwright/test'
import {
  chefTrpcMutation,
  chefTrpcQuery,
  parseTRPC,
  createChefAuthHeaders,
  fakeUserAuthHeaders,
} from '../../../fixtures/chef'
import { assertTRPCSuccess, assertTRPCError } from '../../../helpers/assertions'

const AUTH_URL = process.env['AUTH_SERVICE_URL'] ?? 'http://localhost:3001'

function futureDateStr(daysAhead = 14): string {
  const d = new Date()
  d.setDate(d.getDate() + daysAhead)
  return d.toISOString().slice(0, 10)
}

function dayName(daysAhead = 14): string {
  const d = new Date()
  d.setDate(d.getDate() + daysAhead)
  return ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][d.getDay()]!
}

test.describe('blackout date management', () => {
  test('add blackout → check availability is false → remove → check restores', async ({ request }) => {
    const chefHeaders = await createChefAuthHeaders(request, AUTH_URL, 'blackout-flow')
    const profileRes = await chefTrpcMutation(
      request, 'createChefProfile', { displayName: 'Chef Blackout Flow' }, chefHeaders,
    )
    const profileBody = await parseTRPC<{ _id: string }>(profileRes)
    assertTRPCSuccess(profileBody)
    const chefId = (profileBody.data as any)._id as string

    const targetDate = futureDateStr(14)
    const targetDow = dayName(14)

    // Set schedule with low leadTime so availability check passes
    await chefTrpcMutation(request, 'upsertChefSchedule', {
      recurringDays: [{ dayOfWeek: targetDow, windows: [], isActive: true }],
      capacity: { maxOrdersPerDay: 5, leadTimeHours: 1, prepTimeMinutes: 30 },
    }, chefHeaders)

    const userHeaders = fakeUserAuthHeaders()

    // Add blackout
    const addRes = await chefTrpcMutation(request, 'addBlackoutDate', {
      date: targetDate,
      reason: 'HOLIDAY',
    }, chefHeaders)
    assertTRPCSuccess(await parseTRPC(addRes))

    // Check availability — should be false due to blackout
    const check1 = await chefTrpcQuery(request, 'checkChefAvailability', { chefId, date: targetDate }, userHeaders)
    const body1 = await parseTRPC<{ available: boolean }>(check1)
    assertTRPCSuccess(body1)
    expect(body1.data!.available).toBe(false)

    // Remove blackout
    const removeRes = await chefTrpcMutation(request, 'removeBlackoutDate', {
      date: targetDate,
      reason: 'HOLIDAY',
    }, chefHeaders)
    assertTRPCSuccess(await parseTRPC(removeRes))

    // Check availability — blackout reason should be gone
    const check2 = await chefTrpcQuery(request, 'checkChefAvailability', { chefId, date: targetDate }, userHeaders)
    const body2 = await parseTRPC<{ available: boolean; reason?: string }>(check2)
    assertTRPCSuccess(body2)
    expect(body2.data!.reason ?? '').not.toContain('Blackout')
  })

  test('returns 400 for duplicate blackout (date + reason)', async ({ request }) => {
    const headers = await createChefAuthHeaders(request, AUTH_URL, 'blackout-dup')
    await chefTrpcMutation(request, 'createChefProfile', { displayName: 'Chef DupBlackout' }, headers)
    await chefTrpcMutation(request, 'upsertChefSchedule', { recurringDays: [] }, headers)

    const date = futureDateStr(20)
    await chefTrpcMutation(request, 'addBlackoutDate', { date, reason: 'VACATION' }, headers)

    const res = await chefTrpcMutation(request, 'addBlackoutDate', { date, reason: 'VACATION' }, headers)
    const body = await parseTRPC(res)
    assertTRPCError(body, 400)
  })
})
