/**
 * API Tests: activatePlan (Phase 6)
 */
import { test, expect } from '@playwright/test'
import { chefTrpcMutation, parseTRPC, createChefAuthHeaders } from '../../../fixtures/chef'
import { assertTRPCSuccess, assertTRPCError } from '../../../helpers/assertions'

const AUTH_URL = process.env['AUTH_SERVICE_URL'] ?? 'http://localhost:3001'

test.describe('tRPC activatePlan', () => {
  test('returns 400 when plan has no tiers', async ({ request }) => {
    const headers = await createChefAuthHeaders(request, AUTH_URL, 'activate-no-tiers')
    await chefTrpcMutation(request, 'createChefProfile', { displayName: 'Chef No Tiers' }, headers)

    const createRes = await chefTrpcMutation(request, 'createPlan', { name: 'Empty Plan', type: 'ONE_OFF' }, headers)
    const createBody = await parseTRPC<{ _id: string }>(createRes)
    assertTRPCSuccess(createBody)
    const planId = (createBody.data as any)._id as string

    const activateRes = await chefTrpcMutation(request, 'activatePlan', { planId }, headers)
    const activateBody = await parseTRPC(activateRes)
    assertTRPCError(activateBody, 400)
  })

  test('returns 400 when chef is not verified (PENDING)', async ({ request }) => {
    const headers = await createChefAuthHeaders(request, AUTH_URL, 'activate-unverified')
    await chefTrpcMutation(request, 'createChefProfile', { displayName: 'Chef Unverified' }, headers)

    const dishRes = await chefTrpcMutation(request, 'createDish', { name: 'Test Dish', price: 500 }, headers)
    const dishBody = await parseTRPC<{ _id: string }>(dishRes)
    assertTRPCSuccess(dishBody)
    const dishId = (dishBody.data as any)._id as string

    const planRes = await chefTrpcMutation(request, 'createPlan', { name: 'My Plan', type: 'ONE_OFF' }, headers)
    const planBody = await parseTRPC<{ _id: string }>(planRes)
    assertTRPCSuccess(planBody)
    const planId = (planBody.data as any)._id as string

    await chefTrpcMutation(request, 'managePlanTiers', {
      planId,
      tiers: [{ name: 'Tier 1', dishIds: [dishId] }],
    }, headers)

    // Chef is PENDING — activation should fail
    const activateRes = await chefTrpcMutation(request, 'activatePlan', { planId }, headers)
    const activateBody = await parseTRPC(activateRes)
    assertTRPCError(activateBody, 400)
  })

  test('returns 404 for non-existent planId', async ({ request }) => {
    const headers = await createChefAuthHeaders(request, AUTH_URL, 'activate-not-found')
    const res = await chefTrpcMutation(request, 'activatePlan', { planId: '000000000000000000000001' }, headers)
    const body = await parseTRPC(res)
    assertTRPCError(body, 404)
  })

  test('returns 401 without auth headers', async ({ request }) => {
    const res = await chefTrpcMutation(request, 'activatePlan', { planId: '000000000000000000000001' })
    const body = await parseTRPC(res)
    assertTRPCError(body, 401)
  })
})
