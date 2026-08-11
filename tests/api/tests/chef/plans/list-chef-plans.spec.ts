/**
 * API Tests: listChefPlans (Phase 6)
 */
import { test, expect } from '@playwright/test'
import { chefTrpcMutation, chefTrpcQuery, parseTRPC, createChefAuthHeaders, fakeUserAuthHeaders } from '../../../fixtures/chef'
import { assertTRPCSuccess, assertTRPCError } from '../../../helpers/assertions'

const AUTH_URL = process.env['AUTH_SERVICE_URL'] ?? 'http://localhost:3001'

test.describe('tRPC listChefPlans', () => {
  test('chef can list their own DRAFT plans', async ({ request }) => {
    const headers = await createChefAuthHeaders(request, AUTH_URL, 'list-plans-chef')
    const profileRes = await chefTrpcMutation(request, 'createChefProfile', { displayName: 'Chef List Plans' }, headers)
    const profileBody = await parseTRPC<{ _id: string }>(profileRes)
    assertTRPCSuccess(profileBody)
    const chefId = (profileBody.data as any)._id as string

    await chefTrpcMutation(request, 'createPlan', { name: 'Plan A', type: 'ONE_OFF' }, headers)
    await chefTrpcMutation(request, 'createPlan', { name: 'Plan B', type: 'ONE_OFF' }, headers)

    const listRes = await chefTrpcQuery(request, 'listChefPlans', { chefId }, headers)
    const listBody = await parseTRPC<{ plans: unknown[]; total: number }>(listRes)

    assertTRPCSuccess(listBody)
    expect(listBody.data!.total).toBeGreaterThanOrEqual(2)
  })

  test('USER sees only ACTIVE plans (DRAFT hidden)', async ({ request }) => {
    const chefHeaders = await createChefAuthHeaders(request, AUTH_URL, 'list-plans-user-vis')
    const profileRes = await chefTrpcMutation(request, 'createChefProfile', { displayName: 'Chef Vis Test' }, chefHeaders)
    const profileBody = await parseTRPC<{ _id: string }>(profileRes)
    assertTRPCSuccess(profileBody)
    const chefId = (profileBody.data as any)._id as string

    // Create a DRAFT plan only
    await chefTrpcMutation(request, 'createPlan', { name: 'Draft Plan', type: 'ONE_OFF' }, chefHeaders)

    const userHeaders = fakeUserAuthHeaders()
    const listRes = await chefTrpcQuery(request, 'listChefPlans', { chefId }, userHeaders)
    const listBody = await parseTRPC<{ plans: unknown[]; total: number }>(listRes)

    assertTRPCSuccess(listBody)
    // No ACTIVE plans — customer sees 0
    expect(listBody.data!.total).toBe(0)
  })

  test('pagination works with limit and offset', async ({ request }) => {
    const headers = await createChefAuthHeaders(request, AUTH_URL, 'list-plans-pagination')
    const profileRes = await chefTrpcMutation(request, 'createChefProfile', { displayName: 'Chef Paginate Plans' }, headers)
    const profileBody = await parseTRPC<{ _id: string }>(profileRes)
    assertTRPCSuccess(profileBody)
    const chefId = (profileBody.data as any)._id as string

    for (let i = 1; i <= 3; i++) {
      await chefTrpcMutation(request, 'createPlan', { name: `Plan ${i}`, type: 'ONE_OFF' }, headers)
    }

    const page1Res = await chefTrpcQuery(request, 'listChefPlans', { chefId, limit: 2, offset: 0 }, headers)
    const page1Body = await parseTRPC<{ plans: unknown[]; total: number }>(page1Res)
    assertTRPCSuccess(page1Body)
    expect(page1Body.data!.plans).toHaveLength(2)
    expect(page1Body.data!.total).toBeGreaterThanOrEqual(3)
  })

  test('returns 401 without auth headers', async ({ request }) => {
    const res = await chefTrpcQuery(request, 'listChefPlans', { chefId: '000000000000000000000001' })
    const body = await parseTRPC(res)
    assertTRPCError(body, 401)
  })
})
