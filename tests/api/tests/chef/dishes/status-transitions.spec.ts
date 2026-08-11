/**
 * API Tests: dish status transitions
 *
 * Covers: archiveDish, deactivateDish, activateDish, invalid transition rejection.
 *
 * Note: activateDish requires chef.verificationStatus === 'ACTIVE', which requires
 * an admin to set it via updateChefStatus. Full DRAFT→ACTIVE flow is tested in
 * integration — here we test the validation (unverified chef blocked) and archival flows.
 */
import { test, expect } from '@playwright/test'
import { chefTrpcMutation, chefTrpcQuery, parseTRPC, createChefAuthHeaders, createAdminAuthHeaders, fakeUserAuthHeaders } from '../../../fixtures/chef'
import { assertTRPCSuccess, assertTRPCError } from '../../../helpers/assertions'

const AUTH_URL = process.env['AUTH_SERVICE_URL'] ?? 'http://localhost:3001'

const baseDish = { name: 'Nihari', price: 750 }

test.describe('dish status transitions', () => {
  test('DRAFT → ARCHIVED via archiveDish', async ({ request }) => {
    const headers = await createChefAuthHeaders(request, AUTH_URL, 'st-archive-draft')
    await chefTrpcMutation(request, 'createChefProfile', { displayName: 'Chef Archive Flow' }, headers)

    const createRes = await chefTrpcMutation(request, 'createDish', baseDish, headers)
    const createBody = await parseTRPC<{ _id: string; status: string }>(createRes)
    assertTRPCSuccess(createBody)
    const dishId = (createBody.data as any)._id as string
    expect(createBody.data!.status).toBe('DRAFT')

    const archiveRes = await chefTrpcMutation(request, 'archiveDish', { dishId }, headers)
    const archiveBody = await parseTRPC<{ status: string }>(archiveRes)
    assertTRPCSuccess(archiveBody)
    expect(archiveBody.data!.status).toBe('ARCHIVED')
  })

  test('ARCHIVED → ARCHIVED is rejected (already archived)', async ({ request }) => {
    const headers = await createChefAuthHeaders(request, AUTH_URL, 'st-already-archived')
    await chefTrpcMutation(request, 'createChefProfile', { displayName: 'Chef Re-Archive' }, headers)

    const createRes = await chefTrpcMutation(request, 'createDish', baseDish, headers)
    const createBody = await parseTRPC<{ _id: string }>(createRes)
    assertTRPCSuccess(createBody)
    const dishId = (createBody.data as any)._id as string

    await chefTrpcMutation(request, 'archiveDish', { dishId }, headers)

    // Try to archive again — should fail
    const reArchiveRes = await chefTrpcMutation(request, 'archiveDish', { dishId }, headers)
    const reArchiveBody = await parseTRPC(reArchiveRes)
    assertTRPCError(reArchiveBody, 400)
  })

  test('deactivateDish on DRAFT dish is rejected', async ({ request }) => {
    const headers = await createChefAuthHeaders(request, AUTH_URL, 'st-deactivate-draft')
    await chefTrpcMutation(request, 'createChefProfile', { displayName: 'Chef Deactivate Draft' }, headers)

    const createRes = await chefTrpcMutation(request, 'createDish', baseDish, headers)
    const createBody = await parseTRPC<{ _id: string }>(createRes)
    assertTRPCSuccess(createBody)
    const dishId = (createBody.data as any)._id as string

    const deactivateRes = await chefTrpcMutation(request, 'deactivateDish', { dishId }, headers)
    const deactivateBody = await parseTRPC(deactivateRes)
    assertTRPCError(deactivateBody, 400)
  })

  test('activateDish on unverified chef is rejected', async ({ request }) => {
    const headers = await createChefAuthHeaders(request, AUTH_URL, 'st-activate-unverified')
    await chefTrpcMutation(request, 'createChefProfile', { displayName: 'Chef Unverified' }, headers)

    const createRes = await chefTrpcMutation(request, 'createDish', baseDish, headers)
    const createBody = await parseTRPC<{ _id: string }>(createRes)
    assertTRPCSuccess(createBody)
    const dishId = (createBody.data as any)._id as string

    // Chef is PENDING verification — activateDish should fail
    const activateRes = await chefTrpcMutation(request, 'activateDish', { dishId }, headers)
    const activateBody = await parseTRPC(activateRes)
    assertTRPCError(activateBody, 400)
  })

  test('returns 401 for archiveDish without auth headers', async ({ request }) => {
    const res = await chefTrpcMutation(request, 'archiveDish', { dishId: '000000000000000000000001' })
    const body = await parseTRPC(res)
    assertTRPCError(body, 401)
  })

  test('returns 404 for archiveDish with non-existent dishId', async ({ request }) => {
    const headers = await createChefAuthHeaders(request, AUTH_URL, 'st-404-archive')
    const res = await chefTrpcMutation(request, 'archiveDish', { dishId: '000000000000000000000001' }, headers)
    const body = await parseTRPC(res)
    assertTRPCError(body, 404)
  })
})
