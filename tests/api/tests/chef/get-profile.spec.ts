/**
 * Tests: GET /api/v1/chefs/:chefId (getChefProfile)
 *
 * getChefProfile is a tRPC query (GET).
 * Input: { chefId: string }
 * Success: returns full IChefProfile
 * Errors: 404 for unknown chefId
 */
import { test, expect } from '@playwright/test'
import { chefTrpcMutation, chefTrpcQuery, parseTRPC, createChefAuthHeaders, fakeUserAuthHeaders } from '../../fixtures/chef'
import { assertTRPCSuccess, assertTRPCError } from '../../helpers/assertions'

const AUTH_URL = process.env['AUTH_SERVICE_URL'] ?? 'http://localhost:3001'

test.describe('tRPC getChefProfile', () => {
  test('returns chef profile by chefId', async ({ request }) => {
    const chefHeaders = await createChefAuthHeaders(request, AUTH_URL, 'get-profile-test')

    // Create profile first
    const createRes = await chefTrpcMutation(
      request,
      'createChefProfile',
      { displayName: 'Chef Retriever', bio: 'A retrieval test chef' },
      chefHeaders,
    )
    const createBody = await parseTRPC<{ _id: string; displayName: string }>(createRes)
    assertTRPCSuccess(createBody)
    const chefId = (createBody.data as any)._id as string

    // Fetch the profile as a USER (any authenticated user can view)
    const userHeaders = fakeUserAuthHeaders()
    const res = await chefTrpcQuery(
      request,
      'getChefProfile',
      { chefId },
      userHeaders,
    )
    const body = await parseTRPC<{ displayName: string }>(res)

    assertTRPCSuccess(body)
    expect(body.data!.displayName).toBe('Chef Retriever')
  })

  test('returns 404 for unknown chefId', async ({ request }) => {
    const userHeaders = fakeUserAuthHeaders()

    const res = await chefTrpcQuery(
      request,
      'getChefProfile',
      { chefId: '000000000000000000000001' }, // valid ObjectId format but non-existent
      userHeaders,
    )
    const body = await parseTRPC(res)
    assertTRPCError(body, 404)
  })

  test('returns 401 when identity headers are missing', async ({ request }) => {
    const res = await chefTrpcQuery(
      request,
      'getChefProfile',
      { chefId: '000000000000000000000001' },
    )
    const body = await parseTRPC(res)
    assertTRPCError(body, 401)
  })
})
