/**
 * API Tests: capacity management (Phase 5)
 */
import { test, expect } from '@playwright/test'
import { chefTrpcMutation, parseTRPC, createChefAuthHeaders } from '../../../fixtures/chef'
import { assertTRPCSuccess, assertTRPCError } from '../../../helpers/assertions'

const AUTH_URL = process.env['AUTH_SERVICE_URL'] ?? 'http://localhost:3001'

test.describe('capacity management', () => {
  test('updates maxOrdersPerDay and capacity is reflected in schedule', async ({ request }) => {
    const headers = await createChefAuthHeaders(request, AUTH_URL, 'capacity-update')
    await chefTrpcMutation(request, 'createChefProfile', { displayName: 'Chef Capacity' }, headers)

    await chefTrpcMutation(request, 'upsertChefSchedule', {
      recurringDays: [{ dayOfWeek: 'MON', windows: [], isActive: true }],
      capacity: { maxOrdersPerDay: 5, leadTimeHours: 24, prepTimeMinutes: 60 },
    }, headers)

    const res = await chefTrpcMutation(request, 'updateCapacity', {
      maxOrdersPerDay: 15,
      leadTimeHours: 48,
    }, headers)
    const body = await parseTRPC<{ capacity: { maxOrdersPerDay: number; leadTimeHours: number } }>(res)

    assertTRPCSuccess(body)
    expect((body.data as any).capacity.maxOrdersPerDay).toBe(15)
    expect((body.data as any).capacity.leadTimeHours).toBe(48)
  })

  test('returns 400 for maxOrdersPerDay out of range', async ({ request }) => {
    const headers = await createChefAuthHeaders(request, AUTH_URL, 'capacity-bad')
    await chefTrpcMutation(request, 'createChefProfile', { displayName: 'Chef BadCap' }, headers)
    await chefTrpcMutation(request, 'upsertChefSchedule', { recurringDays: [] }, headers)

    const res = await chefTrpcMutation(request, 'updateCapacity', { maxOrdersPerDay: 999 }, headers)
    const body = await parseTRPC(res)
    assertTRPCError(body, 400)
  })

  test('returns 401 without auth headers', async ({ request }) => {
    const res = await chefTrpcMutation(request, 'updateCapacity', { maxOrdersPerDay: 10 })
    const body = await parseTRPC(res)
    assertTRPCError(body, 401)
  })
})
