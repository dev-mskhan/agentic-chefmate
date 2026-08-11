/**
 * API Tests: createDish
 *
 * POST /trpc/createDish (tRPC mutation)
 * Also via REST: POST /api/v1/chefs/me/dishes
 *
 * Covers: success, invalid price, unknown dietaryTag, 401/403 auth errors
 */
import { test, expect } from '@playwright/test'
import { chefTrpcMutation, parseTRPC, createChefAuthHeaders, fakeUserAuthHeaders } from '../../../fixtures/chef'
import { assertTRPCSuccess, assertTRPCError } from '../../../helpers/assertions'

const AUTH_URL = process.env['AUTH_SERVICE_URL'] ?? 'http://localhost:3001'

const validDish = {
  name:        'Chicken Biryani',
  description: 'Aromatic basmati rice with tender chicken',
  price:       850,
  currency:    'PKR',
  dietaryTags: ['HALAL'],
}

test.describe('tRPC createDish', () => {
  test('creates a dish successfully with DRAFT status', async ({ request }) => {
    const headers = await createChefAuthHeaders(request, AUTH_URL, 'create-dish-ok')

    // Create chef profile first
    await chefTrpcMutation(request, 'createChefProfile', { displayName: 'Chef Biryani' }, headers)

    const res = await chefTrpcMutation(request, 'createDish', validDish, headers)
    const body = await parseTRPC<{ name: string; status: string; chefId: string }>(res)

    assertTRPCSuccess(body)
    expect(body.data!.name).toBe('Chicken Biryani')
    expect(body.data!.status).toBe('DRAFT')
    expect(body.data!.chefId).toBeTruthy()
  })

  test('creates dish with ingredients', async ({ request }) => {
    const headers = await createChefAuthHeaders(request, AUTH_URL, 'create-dish-ingredients')
    await chefTrpcMutation(request, 'createChefProfile', { displayName: 'Chef Daal' }, headers)

    const res = await chefTrpcMutation(request, 'createDish', {
      ...validDish,
      name:        'Daal Makhani',
      ingredients: [
        { name: 'lentils', quantity: 200, unit: 'g' },
        { name: 'butter',  quantity: 50,  unit: 'g' },
      ],
    }, headers)
    const body = await parseTRPC<{ ingredients: unknown[] }>(res)

    assertTRPCSuccess(body)
    expect(body.data!.ingredients).toHaveLength(2)
  })

  test('returns 400 for invalid price (negative)', async ({ request }) => {
    const headers = await createChefAuthHeaders(request, AUTH_URL, 'create-dish-bad-price')
    await chefTrpcMutation(request, 'createChefProfile', { displayName: 'Chef BadPrice' }, headers)

    const res = await chefTrpcMutation(request, 'createDish', { ...validDish, price: -10 }, headers)
    const body = await parseTRPC(res)
    assertTRPCError(body, 400)
  })

  test('returns 400 for invalid price (too many decimal places)', async ({ request }) => {
    const headers = await createChefAuthHeaders(request, AUTH_URL, 'create-dish-decimal')
    await chefTrpcMutation(request, 'createChefProfile', { displayName: 'Chef Decimal' }, headers)

    const res = await chefTrpcMutation(request, 'createDish', { ...validDish, price: 100.999 }, headers)
    const body = await parseTRPC(res)
    assertTRPCError(body, 400)
  })

  test('returns 400 for unknown dietaryTag', async ({ request }) => {
    const headers = await createChefAuthHeaders(request, AUTH_URL, 'create-dish-bad-tag')
    await chefTrpcMutation(request, 'createChefProfile', { displayName: 'Chef Tags' }, headers)

    const res = await chefTrpcMutation(request, 'createDish', {
      ...validDish,
      dietaryTags: ['ORGANIC'],
    }, headers)
    const body = await parseTRPC(res)
    assertTRPCError(body, 400)
  })

  test('returns 400 for empty name', async ({ request }) => {
    const headers = await createChefAuthHeaders(request, AUTH_URL, 'create-dish-empty-name')
    await chefTrpcMutation(request, 'createChefProfile', { displayName: 'Chef EmptyName' }, headers)

    const res = await chefTrpcMutation(request, 'createDish', { ...validDish, name: '' }, headers)
    const body = await parseTRPC(res)
    assertTRPCError(body, 400)
  })

  test('returns 401 when identity headers are missing', async ({ request }) => {
    const res = await chefTrpcMutation(request, 'createDish', validDish)
    const body = await parseTRPC(res)
    assertTRPCError(body, 401)
  })

  test('returns 403 when role is USER (not CHEF)', async ({ request }) => {
    const userHeaders = fakeUserAuthHeaders()
    const res = await chefTrpcMutation(request, 'createDish', validDish, userHeaders)
    const body = await parseTRPC(res)
    assertTRPCError(body, 403)
  })

  test('returns 404 when chef profile does not exist', async ({ request }) => {
    const headers = await createChefAuthHeaders(request, AUTH_URL, 'create-dish-no-profile')
    // Note: no createChefProfile call — profile missing

    const res = await chefTrpcMutation(request, 'createDish', validDish, headers)
    const body = await parseTRPC(res)
    assertTRPCError(body, 404)
  })
})
