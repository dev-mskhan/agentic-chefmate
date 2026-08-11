/**
 * API Tests: listChefDishes
 *
 * GET /trpc/listChefDishes?input={"chefId":"..."} (tRPC query)
 * Also via REST: GET /api/v1/chefs/:chefId/dishes
 *
 * Covers: pagination, status filter for customer vs chef
 */
import { test, expect } from '@playwright/test'
import { chefTrpcMutation, chefTrpcQuery, parseTRPC, createChefAuthHeaders, fakeUserAuthHeaders } from '../../../fixtures/chef'
import { assertTRPCSuccess, assertTRPCError } from '../../../helpers/assertions'

const AUTH_URL = process.env['AUTH_SERVICE_URL'] ?? 'http://localhost:3001'

test.describe('tRPC listChefDishes', () => {
  test('chef can list their own DRAFT dishes', async ({ request }) => {
    const headers = await createChefAuthHeaders(request, AUTH_URL, 'list-dishes-chef')
    const profileRes = await chefTrpcMutation(request, 'createChefProfile', { displayName: 'Chef List Dishes' }, headers)
    const profileBody = await parseTRPC<{ _id: string }>(profileRes)
    assertTRPCSuccess(profileBody)
    const chefId = (profileBody.data as any)._id as string

    // Create 2 dishes
    await chefTrpcMutation(request, 'createDish', { name: 'Dish A', price: 100 }, headers)
    await chefTrpcMutation(request, 'createDish', { name: 'Dish B', price: 200 }, headers)

    const listRes = await chefTrpcQuery(request, 'listChefDishes', { chefId }, headers)
    const listBody = await parseTRPC<{ dishes: unknown[]; total: number }>(listRes)

    assertTRPCSuccess(listBody)
    expect(listBody.data!.total).toBeGreaterThanOrEqual(2)
    expect(Array.isArray(listBody.data!.dishes)).toBe(true)
  })

  test('USER sees only ACTIVE dishes (not DRAFT)', async ({ request }) => {
    const chefHeaders = await createChefAuthHeaders(request, AUTH_URL, 'list-dishes-user-filter')
    const profileRes = await chefTrpcMutation(request, 'createChefProfile', { displayName: 'Chef Filtered' }, chefHeaders)
    const profileBody = await parseTRPC<{ _id: string }>(profileRes)
    assertTRPCSuccess(profileBody)
    const chefId = (profileBody.data as any)._id as string

    // Create a DRAFT dish
    await chefTrpcMutation(request, 'createDish', { name: 'Draft Dish', price: 300 }, chefHeaders)

    // User requests the chef's dishes
    const userHeaders = fakeUserAuthHeaders()
    const listRes = await chefTrpcQuery(request, 'listChefDishes', { chefId }, userHeaders)
    const listBody = await parseTRPC<{ dishes: unknown[]; total: number }>(listRes)

    assertTRPCSuccess(listBody)
    // DRAFT dishes are hidden from customers — total should be 0 (no ACTIVE dishes)
    expect(listBody.data!.total).toBe(0)
    expect(listBody.data!.dishes).toHaveLength(0)
  })

  test('pagination works with limit and offset', async ({ request }) => {
    const headers = await createChefAuthHeaders(request, AUTH_URL, 'list-dishes-pagination')
    const profileRes = await chefTrpcMutation(request, 'createChefProfile', { displayName: 'Chef Paginate' }, headers)
    const profileBody = await parseTRPC<{ _id: string }>(profileRes)
    assertTRPCSuccess(profileBody)
    const chefId = (profileBody.data as any)._id as string

    // Create 3 dishes
    for (let i = 1; i <= 3; i++) {
      await chefTrpcMutation(request, 'createDish', { name: `Paginated Dish ${i}`, price: i * 100 }, headers)
    }

    // Request page 1 (limit 2)
    const page1Res = await chefTrpcQuery(request, 'listChefDishes', { chefId, limit: 2, offset: 0 }, headers)
    const page1Body = await parseTRPC<{ dishes: unknown[]; total: number }>(page1Res)
    assertTRPCSuccess(page1Body)
    expect(page1Body.data!.dishes).toHaveLength(2)
    expect(page1Body.data!.total).toBeGreaterThanOrEqual(3)

    // Request page 2 (offset 2)
    const page2Res = await chefTrpcQuery(request, 'listChefDishes', { chefId, limit: 2, offset: 2 }, headers)
    const page2Body = await parseTRPC<{ dishes: unknown[]; total: number }>(page2Res)
    assertTRPCSuccess(page2Body)
    expect(page2Body.data!.dishes.length).toBeGreaterThanOrEqual(1)
  })

  test('returns 401 without auth headers', async ({ request }) => {
    const res = await chefTrpcQuery(request, 'listChefDishes', { chefId: '000000000000000000000001' })
    const body = await parseTRPC(res)
    assertTRPCError(body, 401)
  })

  test('returns empty list for chef with no dishes', async ({ request }) => {
    const headers = await createChefAuthHeaders(request, AUTH_URL, 'list-dishes-empty')
    const profileRes = await chefTrpcMutation(request, 'createChefProfile', { displayName: 'Chef No Dishes' }, headers)
    const profileBody = await parseTRPC<{ _id: string }>(profileRes)
    assertTRPCSuccess(profileBody)
    const chefId = (profileBody.data as any)._id as string

    const listRes = await chefTrpcQuery(request, 'listChefDishes', { chefId }, headers)
    const listBody = await parseTRPC<{ dishes: unknown[]; total: number }>(listRes)

    assertTRPCSuccess(listBody)
    expect(listBody.data!.total).toBe(0)
    expect(listBody.data!.dishes).toHaveLength(0)
  })
})
