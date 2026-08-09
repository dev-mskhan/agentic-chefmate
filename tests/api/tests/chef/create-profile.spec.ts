/**
 * Tests: POST /api/v1/chefs (createChefProfile)
 *
 * createChefProfile is a tRPC mutation (POST).
 * Input: { displayName, bio?, phone?, cuisineSpecialties?, serviceArea? }
 * Success: 201 with created profile
 * Errors: 409 ConflictError on duplicate, 400 validation errors, 401/403 auth errors
 */
import { test, expect } from '@playwright/test'
import { chefTrpcMutation, parseTRPC, createChefAuthHeaders, fakeUserAuthHeaders } from '../../fixtures/chef'
import { assertTRPCSuccess, assertTRPCError } from '../../helpers/assertions'

const AUTH_URL = process.env['AUTH_SERVICE_URL'] ?? 'http://localhost:3001'

test.describe('tRPC createChefProfile', () => {
  test('creates a chef profile successfully', async ({ request }) => {
    const headers = await createChefAuthHeaders(request, AUTH_URL)

    const res = await chefTrpcMutation(
      request,
      'createChefProfile',
      { displayName: 'Chef Hassan', bio: 'Experienced home chef', cuisineSpecialties: ['PAKISTANI'] },
      headers,
    )
    const body = await parseTRPC<{ userId: string; displayName: string; verificationStatus: string }>(res)

    assertTRPCSuccess(body)
    expect(body.data!.userId).toBe(headers['x-user-id'])
    expect(body.data!.displayName).toBe('Chef Hassan')
    expect(body.data!.verificationStatus).toBe('PENDING')
  })

  test('returns ConflictError on duplicate profile for same userId', async ({ request }) => {
    const headers = await createChefAuthHeaders(request, AUTH_URL, 'conflict-test')

    // First creation
    const res1 = await chefTrpcMutation(
      request,
      'createChefProfile',
      { displayName: 'Chef Duplicate' },
      headers,
    )
    const body1 = await parseTRPC(res1)
    assertTRPCSuccess(body1)

    // Second creation with same userId
    const res2 = await chefTrpcMutation(
      request,
      'createChefProfile',
      { displayName: 'Chef Duplicate Again' },
      headers,
    )
    const body2 = await parseTRPC(res2)
    assertTRPCError(body2, 409)
  })

  test('returns 400 when displayName is too short', async ({ request }) => {
    const headers = await createChefAuthHeaders(request, AUTH_URL, 'val-short')

    const res = await chefTrpcMutation(
      request,
      'createChefProfile',
      { displayName: 'A' }, // too short
      headers,
    )
    const body = await parseTRPC(res)
    assertTRPCError(body, 400)
  })

  test('returns 400 when displayName is missing', async ({ request }) => {
    const headers = await createChefAuthHeaders(request, AUTH_URL, 'val-missing')

    const res = await chefTrpcMutation(request, 'createChefProfile', {}, headers)
    const body = await parseTRPC(res)
    assertTRPCError(body, 400)
  })

  test('returns 400 when cuisineSpecialty is invalid', async ({ request }) => {
    const headers = await createChefAuthHeaders(request, AUTH_URL, 'val-cuisine')

    const res = await chefTrpcMutation(
      request,
      'createChefProfile',
      { displayName: 'Chef Valid', cuisineSpecialties: ['INVALID_CUISINE'] },
      headers,
    )
    const body = await parseTRPC(res)
    assertTRPCError(body, 400)
  })

  test('returns 401 when identity headers are missing', async ({ request }) => {
    const res = await chefTrpcMutation(request, 'createChefProfile', {
      displayName: 'Chef No Auth',
    })
    const body = await parseTRPC(res)
    assertTRPCError(body, 401)
  })

  test('returns 403 when role is not CHEF', async ({ request }) => {
    const userHeaders = fakeUserAuthHeaders()

    const res = await chefTrpcMutation(
      request,
      'createChefProfile',
      { displayName: 'Chef Wrong Role' },
      userHeaders,
    )
    const body = await parseTRPC(res)
    assertTRPCError(body, 403)
  })
})
