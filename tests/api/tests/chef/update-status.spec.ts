/**
 * Tests: PATCH /api/v1/chefs/:chefId/status (updateChefStatus)
 *
 * updateChefStatus is a tRPC mutation (POST).
 * Input: { chefId, verificationStatus?, accountState?, reason? }
 * Success: returns updated status
 * Errors: 403 for non-admin, 404 for unknown chefId
 */
import { test, expect } from '@playwright/test'
import { chefTrpcMutation, parseTRPC, createChefAuthHeaders, createAdminAuthHeaders, fakeUserAuthHeaders } from '../../fixtures/chef'
import { assertTRPCSuccess, assertTRPCError } from '../../helpers/assertions'

const AUTH_URL = process.env['AUTH_SERVICE_URL'] ?? 'http://localhost:3001'

test.describe('tRPC updateChefStatus', () => {
  test('admin can update chef verification status', async ({ request }) => {
    const chefHeaders  = await createChefAuthHeaders(request, AUTH_URL, 'status-chef')
    const adminHeaders = await createAdminAuthHeaders(request, AUTH_URL)

    // Create a chef profile first
    const createRes = await chefTrpcMutation(
      request,
      'createChefProfile',
      { displayName: 'Chef Status Test' },
      chefHeaders,
    )
    const createBody = await parseTRPC<{ _id: string }>(createRes)
    assertTRPCSuccess(createBody)
    const chefId = (createBody.data as any)._id as string

    // Admin updates the status
    const res = await chefTrpcMutation(
      request,
      'updateChefStatus',
      { chefId, verificationStatus: 'ACTIVE', reason: 'Documents verified' },
      adminHeaders,
    )
    const body = await parseTRPC<{
      chefId: string
      verificationStatus: string
      accountState: string
    }>(res)

    assertTRPCSuccess(body)
    expect(body.data!.verificationStatus).toBe('ACTIVE')
  })

  test('returns 403 when non-admin tries to update status', async ({ request }) => {
    const chefHeaders = await createChefAuthHeaders(request, AUTH_URL, 'status-no-admin')

    // Create a chef profile
    const createRes = await chefTrpcMutation(
      request,
      'createChefProfile',
      { displayName: 'Chef No Admin Status' },
      chefHeaders,
    )
    const createBody = await parseTRPC<{ _id: string }>(createRes)
    assertTRPCSuccess(createBody)
    const chefId = (createBody.data as any)._id as string

    // Chef tries to update their own status (not allowed)
    const res = await chefTrpcMutation(
      request,
      'updateChefStatus',
      { chefId, verificationStatus: 'ACTIVE' },
      chefHeaders, // CHEF role — should be forbidden
    )
    const body = await parseTRPC(res)
    assertTRPCError(body, 403)
  })

  test('returns 403 when USER tries to update status', async ({ request }) => {
    const userHeaders = fakeUserAuthHeaders()

    const res = await chefTrpcMutation(
      request,
      'updateChefStatus',
      { chefId: '000000000000000000000001', verificationStatus: 'ACTIVE' },
      userHeaders,
    )
    const body = await parseTRPC(res)
    assertTRPCError(body, 403)
  })

  test('returns 404 for unknown chefId', async ({ request }) => {
    const adminHeaders = await createAdminAuthHeaders(request, AUTH_URL)

    const res = await chefTrpcMutation(
      request,
      'updateChefStatus',
      { chefId: '000000000000000000000001', verificationStatus: 'ACTIVE' },
      adminHeaders,
    )
    const body = await parseTRPC(res)
    assertTRPCError(body, 404)
  })
})
