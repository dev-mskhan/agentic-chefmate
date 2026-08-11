/**
 * API Tests: upsertChefSchedule (Phase 5)
 * PUT /trpc/upsertChefSchedule
 */
import { test, expect } from '@playwright/test'
import { chefTrpcMutation, parseTRPC, createChefAuthHeaders } from '../../../fixtures/chef'
import { assertTRPCSuccess, assertTRPCError } from '../../../helpers/assertions'

const AUTH_URL = process.env['AUTH_SERVICE_URL'] ?? 'http://localhost:3001'

test.describe('tRPC upsertChefSchedule', () => {
  test('creates a schedule successfully', async ({ request }) => {
    const headers = await createChefAuthHeaders(request, AUTH_URL, 'upsert-sched-create')
    await chefTrpcMutation(request, 'createChefProfile', { displayName: 'Chef Schedule' }, headers)

    const res = await chefTrpcMutation(request, 'upsertChefSchedule', {
      recurringDays: [
        { dayOfWeek: 'MON', windows: [{ openTime: '09:00', closeTime: '18:00' }], isActive: true },
        { dayOfWeek: 'WED', windows: [{ openTime: '10:00', closeTime: '17:00' }], isActive: true },
      ],
      capacity: { maxOrdersPerDay: 10, leadTimeHours: 24, prepTimeMinutes: 60 },
    }, headers)
    const body = await parseTRPC<{ chefId: string; recurringDays: unknown[] }>(res)

    assertTRPCSuccess(body)
    expect((body.data as any).recurringDays).toHaveLength(2)
  })

  test('updates an existing schedule (upsert)', async ({ request }) => {
    const headers = await createChefAuthHeaders(request, AUTH_URL, 'upsert-sched-update')
    await chefTrpcMutation(request, 'createChefProfile', { displayName: 'Chef Upsert' }, headers)

    await chefTrpcMutation(request, 'upsertChefSchedule', {
      recurringDays: [{ dayOfWeek: 'FRI', windows: [], isActive: true }],
    }, headers)

    // Update — add a second day
    const res = await chefTrpcMutation(request, 'upsertChefSchedule', {
      recurringDays: [
        { dayOfWeek: 'FRI', windows: [], isActive: true },
        { dayOfWeek: 'SAT', windows: [], isActive: true },
      ],
    }, headers)
    const body = await parseTRPC<{ recurringDays: unknown[] }>(res)
    assertTRPCSuccess(body)
    expect((body.data as any).recurringDays).toHaveLength(2)
  })

  test('returns 400 for duplicate dayOfWeek', async ({ request }) => {
    const headers = await createChefAuthHeaders(request, AUTH_URL, 'upsert-sched-dup')
    await chefTrpcMutation(request, 'createChefProfile', { displayName: 'Chef DupDay' }, headers)

    const res = await chefTrpcMutation(request, 'upsertChefSchedule', {
      recurringDays: [
        { dayOfWeek: 'MON', windows: [], isActive: true },
        { dayOfWeek: 'MON', windows: [], isActive: true }, // duplicate
      ],
    }, headers)
    const body = await parseTRPC(res)
    assertTRPCError(body, 400)
  })

  test('returns 400 when openTime >= closeTime', async ({ request }) => {
    const headers = await createChefAuthHeaders(request, AUTH_URL, 'upsert-sched-window')
    await chefTrpcMutation(request, 'createChefProfile', { displayName: 'Chef BadWindow' }, headers)

    const res = await chefTrpcMutation(request, 'upsertChefSchedule', {
      recurringDays: [
        { dayOfWeek: 'TUE', windows: [{ openTime: '18:00', closeTime: '09:00' }], isActive: true },
      ],
    }, headers)
    const body = await parseTRPC(res)
    assertTRPCError(body, 400)
  })

  test('returns 401 without auth headers', async ({ request }) => {
    const res = await chefTrpcMutation(request, 'upsertChefSchedule', {
      recurringDays: [],
    })
    const body = await parseTRPC(res)
    assertTRPCError(body, 401)
  })
})
