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

test.describe('tRPC listChefDishes — cuisine and dietaryTags filters (Phase 4)', () => {
  test('filter by cuisine returns only matching dishes', async ({ request }) => {
    const headers = await createChefAuthHeaders(request, AUTH_URL, 'filter-cuisine')
    const profileRes = await chefTrpcMutation(request, 'createChefProfile', { displayName: 'Chef Cuisine Filter' }, headers)
    const profileBody = await parseTRPC<{ _id: string }>(profileRes)
    assertTRPCSuccess(profileBody)
    const chefId = (profileBody.data as any)._id as string

    // Create dishes with different cuisines
    await chefTrpcMutation(request, 'createDish', { name: 'Karahi Gosht', price: 900, cuisine: 'KARAHI' }, headers)
    await chefTrpcMutation(request, 'createDish', { name: 'Biryani',     price: 800, cuisine: 'PAKISTANI' }, headers)
    await chefTrpcMutation(request, 'createDish', { name: 'Pasta',       price: 600, cuisine: 'ITALIAN' }, headers)

    // Filter by KARAHI — should return only the Karahi dish
    const res = await chefTrpcQuery(request, 'listChefDishes', {
      chefId,
      cuisines: ['KARAHI'],
    }, headers)
    const body = await parseTRPC<{ dishes: any[]; total: number }>(res)

    assertTRPCSuccess(body)
    expect(body.data!.dishes.every((d: any) => d.cuisine === 'KARAHI')).toBe(true)
    expect(body.data!.total).toBeGreaterThanOrEqual(1)
  })

  test('filter by multiple cuisines returns dishes from any of them (OR semantics)', async ({ request }) => {
    const headers = await createChefAuthHeaders(request, AUTH_URL, 'filter-multi-cuisine')
    const profileRes = await chefTrpcMutation(request, 'createChefProfile', { displayName: 'Chef Multi Cuisine' }, headers)
    const profileBody = await parseTRPC<{ _id: string }>(profileRes)
    assertTRPCSuccess(profileBody)
    const chefId = (profileBody.data as any)._id as string

    await chefTrpcMutation(request, 'createDish', { name: 'BBQ Chicken',  price: 700, cuisine: 'BBQ' }, headers)
    await chefTrpcMutation(request, 'createDish', { name: 'Pulao',        price: 500, cuisine: 'PUNJABI' }, headers)
    await chefTrpcMutation(request, 'createDish', { name: 'Fried Rice',   price: 400, cuisine: 'CHINESE' }, headers)

    const res = await chefTrpcQuery(request, 'listChefDishes', {
      chefId,
      cuisines: ['BBQ', 'PUNJABI'],
    }, headers)
    const body = await parseTRPC<{ dishes: any[]; total: number }>(res)

    assertTRPCSuccess(body)
    // All returned dishes must be BBQ or PUNJABI
    expect(body.data!.dishes.every((d: any) => ['BBQ', 'PUNJABI'].includes(d.cuisine))).toBe(true)
  })

  test('filter by dietaryTags uses AND semantics — dish must have all requested tags', async ({ request }) => {
    const headers = await createChefAuthHeaders(request, AUTH_URL, 'filter-dietary')
    const profileRes = await chefTrpcMutation(request, 'createChefProfile', { displayName: 'Chef Dietary Filter' }, headers)
    const profileBody = await parseTRPC<{ _id: string }>(profileRes)
    assertTRPCSuccess(profileBody)
    const chefId = (profileBody.data as any)._id as string

    // Dish A: HALAL + VEGAN
    await chefTrpcMutation(request, 'createDish', {
      name: 'Halal Vegan Dish', price: 350, dietaryTags: ['HALAL', 'VEGAN'],
    }, headers)
    // Dish B: HALAL only
    await chefTrpcMutation(request, 'createDish', {
      name: 'Halal Only Dish', price: 400, dietaryTags: ['HALAL'],
    }, headers)

    // Filter by both HALAL and VEGAN — should return only Dish A
    const res = await chefTrpcQuery(request, 'listChefDishes', {
      chefId,
      dietaryTags: ['HALAL', 'VEGAN'],
    }, headers)
    const body = await parseTRPC<{ dishes: any[]; total: number }>(res)

    assertTRPCSuccess(body)
    // Every returned dish must have BOTH tags
    expect(
      body.data!.dishes.every(
        (d: any) => d.dietaryTags.includes('HALAL') && d.dietaryTags.includes('VEGAN'),
      ),
    ).toBe(true)
  })

  test('returns 400 for invalid cuisine value in cuisines filter', async ({ request }) => {
    const headers = await createChefAuthHeaders(request, AUTH_URL, 'filter-bad-cuisine')
    const profileRes = await chefTrpcMutation(request, 'createChefProfile', { displayName: 'Chef Bad Filter' }, headers)
    const profileBody = await parseTRPC<{ _id: string }>(profileRes)
    assertTRPCSuccess(profileBody)
    const chefId = (profileBody.data as any)._id as string

    const res = await chefTrpcQuery(request, 'listChefDishes', {
      chefId,
      cuisines: ['INVALID_CUISINE'],
    }, headers)
    const body = await parseTRPC(res)
    assertTRPCError(body, 400)
  })
})
