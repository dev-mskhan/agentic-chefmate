/**
 * API Tests: createPlan (Phase 6)
 * POST /trpc/createPlan
 */
import { test, expect } from '@playwright/test'
import { chefTrpcMutation, parseTRPC, createChefAuthHeaders, fakeUserAuthHeaders } from '../../../fixtures/chef'
import { assertTRPCSuccess, assertTRPCError } from '../../../helpers/assertions'

const AUTH_URL = process.env['AUTH_SERVICE_URL'] ?? 'http://localhost:3001'

test.describe('tRPC createPlan', () => {
  test('creates a ONE_OFF plan successfully', async ({ request }) => {
    const headers = await createChefAuthHeaders(request, AUTH_URL, 'create-plan-one-off')
    await chefTrpcMutation(request, 'createChefProfile', { displayName: 'Chef One Off' }, headers)

    const res = await chefTrpcMutation(request, 'createPlan', {
      name: 'Family Feast Box',
      type: 'ONE_OFF',
    }, headers)
    const body = await parseTRPC<{ name: string; type: string; status: string }>(res)

    assertTRPCSuccess(body)
    expect(body.data!.name).toBe('Family Feast Box')
    expect(body.data!.type).toBe('ONE_OFF')
    expect(body.data!.status).toBe('DRAFT')
  })

  test('creates a SUBSCRIPTION plan with frequency', async ({ request }) => {
    const headers = await createChefAuthHeaders(request, AUTH_URL, 'create-plan-sub')
    await chefTrpcMutation(request, 'createChefProfile', { displayName: 'Chef Sub' }, headers)

    const res = await chefTrpcMutation(request, 'createPlan', {
      name:      'Weekly Meals',
      type:      'SUBSCRIPTION',
      frequency: 'WEEKLY',
    }, headers)
    const body = await parseTRPC<{ type: string; frequency: string }>(res)

    assertTRPCSuccess(body)
    expect(body.data!.type).toBe('SUBSCRIPTION')
    expect(body.data!.frequency).toBe('WEEKLY')
  })

  test('returns 400 when SUBSCRIPTION has no frequency', async ({ request }) => {
    const headers = await createChefAuthHeaders(request, AUTH_URL, 'create-plan-no-freq')
    await chefTrpcMutation(request, 'createChefProfile', { displayName: 'Chef NoFreq' }, headers)

    const res = await chefTrpcMutation(request, 'createPlan', {
      name: 'Bad Sub Plan',
      type: 'SUBSCRIPTION',
      // frequency intentionally missing
    }, headers)
    const body = await parseTRPC(res)
    assertTRPCError(body, 400)
  })

  test('returns 400 when ONE_OFF has frequency set', async ({ request }) => {
    const headers = await createChefAuthHeaders(request, AUTH_URL, 'create-plan-one-off-freq')
    await chefTrpcMutation(request, 'createChefProfile', { displayName: 'Chef BadFreq' }, headers)

    const res = await chefTrpcMutation(request, 'createPlan', {
      name:      'Bad One Off',
      type:      'ONE_OFF',
      frequency: 'WEEKLY',
    }, headers)
    const body = await parseTRPC(res)
    assertTRPCError(body, 400)
  })

  test('returns 401 without auth headers', async ({ request }) => {
    const res = await chefTrpcMutation(request, 'createPlan', { name: 'X', type: 'ONE_OFF' })
    const body = await parseTRPC(res)
    assertTRPCError(body, 401)
  })

  test('returns 403 when role is USER', async ({ request }) => {
    const res = await chefTrpcMutation(request, 'createPlan',
      { name: 'X', type: 'ONE_OFF' },
      fakeUserAuthHeaders(),
    )
    const body = await parseTRPC(res)
    assertTRPCError(body, 403)
  })
})
