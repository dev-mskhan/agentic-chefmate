/**
 * API Tests: updateDish
 *
 * PATCH /trpc/updateDish (tRPC mutation)
 * Also via REST: PATCH /api/v1/chefs/me/dishes/:dishId
 *
 * Covers: partial update, ARCHIVED blocks update, 403 cross-chef
 */
import { test, expect } from '@playwright/test'
import { chefTrpcMutation, parseTRPC, createChefAuthHeaders, fakeUserAuthHeaders } from '../../../fixtures/chef'
import { assertTRPCSuccess, assertTRPCError } from '../../../helpers/assertions'

const AUTH_URL = process.env['AUTH_SERVICE_URL'] ?? 'http://localhost:3001'

const baseDish = { name: 'Haleem', price: 400 }

test.describe('tRPC updateDish', () => {
  test('owner can partially update their dish', async ({ request }) => {
    const headers = await createChefAuthHeaders(request, AUTH_URL, 'update-dish-ok')
    await chefTrpcMutation(request, 'createChefProfile', { displayName: 'Chef Haleem' }, headers)

    const createRes = await chefTrpcMutation(request, 'createDish', baseDish, headers)
    const createBody = await parseTRPC<{ _id: string }>(createRes)
    assertTRPCSuccess(createBody)
    const dishId = (createBody.data as any)._id as string

    const updateRes = await chefTrpcMutation(request, 'updateDish', {
      dishId,
      name: 'Haleem Special',
      description: 'Slow-cooked haleem with spices',
    }, headers)
    const updateBody = await parseTRPC<{ name: string; description: string }>(updateRes)

    assertTRPCSuccess(updateBody)
    expect(updateBody.data!.name).toBe('Haleem Special')
    expect(updateBody.data!.description).toBe('Slow-cooked haleem with spices')
  })

  test('ARCHIVED dish cannot be updated', async ({ request }) => {
    const headers = await createChefAuthHeaders(request, AUTH_URL, 'update-archived')
    await chefTrpcMutation(request, 'createChefProfile', { displayName: 'Chef Archive' }, headers)

    const createRes = await chefTrpcMutation(request, 'createDish', baseDish, headers)
    const createBody = await parseTRPC<{ _id: string }>(createRes)
    assertTRPCSuccess(createBody)
    const dishId = (createBody.data as any)._id as string

    // Archive the dish
    const archiveRes = await chefTrpcMutation(request, 'archiveDish', { dishId }, headers)
    const archiveBody = await parseTRPC(archiveRes)
    assertTRPCSuccess(archiveBody)

    // Try to update — should fail
    const updateRes = await chefTrpcMutation(request, 'updateDish', {
      dishId,
      name: 'Updated Haleem',
    }, headers)
    const updateBody = await parseTRPC(updateRes)
    assertTRPCError(updateBody, 400)
  })

  test('returns 403 when USER tries to update another chef dish', async ({ request }) => {
    const chefHeaders = await createChefAuthHeaders(request, AUTH_URL, 'update-403-chef')
    await chefTrpcMutation(request, 'createChefProfile', { displayName: 'Chef Owner' }, chefHeaders)

    const createRes = await chefTrpcMutation(request, 'createDish', baseDish, chefHeaders)
    const createBody = await parseTRPC<{ _id: string }>(createRes)
    assertTRPCSuccess(createBody)
    const dishId = (createBody.data as any)._id as string

    const userHeaders = fakeUserAuthHeaders()
    const updateRes = await chefTrpcMutation(request, 'updateDish', {
      dishId,
      name: 'Hacked Haleem',
    }, userHeaders)
    const updateBody = await parseTRPC(updateRes)
    assertTRPCError(updateBody, 403)
  })

  test('returns 400 for price with too many decimal places', async ({ request }) => {
    const headers = await createChefAuthHeaders(request, AUTH_URL, 'update-bad-price')
    await chefTrpcMutation(request, 'createChefProfile', { displayName: 'Chef Decimal' }, headers)

    const createRes = await chefTrpcMutation(request, 'createDish', baseDish, headers)
    const createBody = await parseTRPC<{ _id: string }>(createRes)
    assertTRPCSuccess(createBody)
    const dishId = (createBody.data as any)._id as string

    const updateRes = await chefTrpcMutation(request, 'updateDish', {
      dishId,
      price: 100.999,
    }, headers)
    const updateBody = await parseTRPC(updateRes)
    assertTRPCError(updateBody, 400)
  })

  test('returns 401 when identity headers are missing', async ({ request }) => {
    const res = await chefTrpcMutation(request, 'updateDish', {
      dishId: '000000000000000000000001',
      name: 'No Auth',
    })
    const body = await parseTRPC(res)
    assertTRPCError(body, 401)
  })
})
