/**
 * API Tests: managePlanTiers (Phase 6)
 */
import { test, expect } from '@playwright/test'
import { chefTrpcMutation, parseTRPC, createChefAuthHeaders } from '../../../fixtures/chef'
import { assertTRPCSuccess, assertTRPCError } from '../../../helpers/assertions'

const AUTH_URL = process.env['AUTH_SERVICE_URL'] ?? 'http://localhost:3001'

test.describe('tRPC managePlanTiers', () => {
  test('replaces tiers with valid dishes owned by the chef', async ({ request }) => {
    const headers = await createChefAuthHeaders(request, AUTH_URL, 'tiers-valid')
    await chefTrpcMutation(request, 'createChefProfile', { displayName: 'Chef Tiers' }, headers)

    const dishRes = await chefTrpcMutation(request, 'createDish', { name: 'Biryani', price: 800 }, headers)
    const dishBody = await parseTRPC<{ _id: string }>(dishRes)
    assertTRPCSuccess(dishBody)
    const dishId = (dishBody.data as any)._id as string

    const planRes = await chefTrpcMutation(request, 'createPlan', { name: 'Tier Plan', type: 'ONE_OFF' }, headers)
    const planBody = await parseTRPC<{ _id: string }>(planRes)
    assertTRPCSuccess(planBody)
    const planId = (planBody.data as any)._id as string

    const tiersRes = await chefTrpcMutation(request, 'managePlanTiers', {
      planId,
      tiers: [{ name: 'Basic', dishIds: [dishId] }],
    }, headers)
    const tiersBody = await parseTRPC<{ tiers: unknown[] }>(tiersRes)
    assertTRPCSuccess(tiersBody)
    expect((tiersBody.data as any).tiers).toHaveLength(1)
  })

  test('returns 400 when dishId belongs to a different chef', async ({ request }) => {
    const chefAHeaders = await createChefAuthHeaders(request, AUTH_URL, 'tiers-cross-chef-a')
    await chefTrpcMutation(request, 'createChefProfile', { displayName: 'Chef A' }, chefAHeaders)

    const chefBHeaders = await createChefAuthHeaders(request, AUTH_URL, 'tiers-cross-chef-b')
    await chefTrpcMutation(request, 'createChefProfile', { displayName: 'Chef B' }, chefBHeaders)

    // Chef B creates a dish
    const dishRes = await chefTrpcMutation(request, 'createDish', { name: 'Chef B Dish', price: 400 }, chefBHeaders)
    const dishBody = await parseTRPC<{ _id: string }>(dishRes)
    assertTRPCSuccess(dishBody)
    const dishId = (dishBody.data as any)._id as string

    // Chef A creates a plan and tries to use Chef B's dish
    const planRes = await chefTrpcMutation(request, 'createPlan', { name: 'Cross-Chef Plan', type: 'ONE_OFF' }, chefAHeaders)
    const planBody = await parseTRPC<{ _id: string }>(planRes)
    assertTRPCSuccess(planBody)
    const planId = (planBody.data as any)._id as string

    const tiersRes = await chefTrpcMutation(request, 'managePlanTiers', {
      planId,
      tiers: [{ name: 'Bad Tier', dishIds: [dishId] }], // dishId belongs to Chef B
    }, chefAHeaders)
    const tiersBody = await parseTRPC(tiersRes)
    assertTRPCError(tiersBody, 400)
  })

  test('returns 401 without auth headers', async ({ request }) => {
    const res = await chefTrpcMutation(request, 'managePlanTiers', {
      planId: '000000000000000000000001',
      tiers: [],
    })
    const body = await parseTRPC(res)
    assertTRPCError(body, 401)
  })
})
