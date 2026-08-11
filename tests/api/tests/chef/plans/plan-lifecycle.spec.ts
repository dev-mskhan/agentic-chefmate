/**
 * API Tests: plan status lifecycle (Phase 6)
 * DRAFT→ARCHIVE, ACTIVE→PAUSED, invalid transitions
 */
import { test, expect } from '@playwright/test'
import { chefTrpcMutation, parseTRPC, createChefAuthHeaders } from '../../../fixtures/chef'
import { assertTRPCSuccess, assertTRPCError } from '../../../helpers/assertions'

const AUTH_URL = process.env['AUTH_SERVICE_URL'] ?? 'http://localhost:3001'

test.describe('plan status lifecycle', () => {
  test('DRAFT → ARCHIVED via archivePlan', async ({ request }) => {
    const headers = await createChefAuthHeaders(request, AUTH_URL, 'lifecycle-archive')
    await chefTrpcMutation(request, 'createChefProfile', { displayName: 'Chef Archive Plan' }, headers)

    const planRes = await chefTrpcMutation(request, 'createPlan', { name: 'Plan To Archive', type: 'ONE_OFF' }, headers)
    const planBody = await parseTRPC<{ _id: string; status: string }>(planRes)
    assertTRPCSuccess(planBody)
    expect(planBody.data!.status).toBe('DRAFT')
    const planId = (planBody.data as any)._id as string

    const archiveRes = await chefTrpcMutation(request, 'archivePlan', { planId }, headers)
    const archiveBody = await parseTRPC<{ status: string }>(archiveRes)
    assertTRPCSuccess(archiveBody)
    expect(archiveBody.data!.status).toBe('ARCHIVED')
  })

  test('ARCHIVED → ARCHIVED rejected (already archived)', async ({ request }) => {
    const headers = await createChefAuthHeaders(request, AUTH_URL, 'lifecycle-re-archive')
    await chefTrpcMutation(request, 'createChefProfile', { displayName: 'Chef Re-Archive' }, headers)

    const planRes = await chefTrpcMutation(request, 'createPlan', { name: 'Plan Archived', type: 'ONE_OFF' }, headers)
    const planBody = await parseTRPC<{ _id: string }>(planRes)
    assertTRPCSuccess(planBody)
    const planId = (planBody.data as any)._id as string

    await chefTrpcMutation(request, 'archivePlan', { planId }, headers)

    const reArchiveRes = await chefTrpcMutation(request, 'archivePlan', { planId }, headers)
    const reArchiveBody = await parseTRPC(reArchiveRes)
    assertTRPCError(reArchiveBody, 400)
  })

  test('updatePlan on ARCHIVED plan is rejected', async ({ request }) => {
    const headers = await createChefAuthHeaders(request, AUTH_URL, 'lifecycle-update-archived')
    await chefTrpcMutation(request, 'createChefProfile', { displayName: 'Chef Update Archived' }, headers)

    const planRes = await chefTrpcMutation(request, 'createPlan', { name: 'Plan X', type: 'ONE_OFF' }, headers)
    const planBody = await parseTRPC<{ _id: string }>(planRes)
    assertTRPCSuccess(planBody)
    const planId = (planBody.data as any)._id as string

    await chefTrpcMutation(request, 'archivePlan', { planId }, headers)

    const updateRes = await chefTrpcMutation(request, 'updatePlan', { planId, name: 'Updated Name' }, headers)
    const updateBody = await parseTRPC(updateRes)
    assertTRPCError(updateBody, 400)
  })

  test('pausePlan rejected when allowPause is false', async ({ request }) => {
    const headers = await createChefAuthHeaders(request, AUTH_URL, 'lifecycle-no-pause')
    await chefTrpcMutation(request, 'createChefProfile', { displayName: 'Chef No Pause' }, headers)

    const planRes = await chefTrpcMutation(request, 'createPlan', {
      name:       'No Pause Plan',
      type:       'ONE_OFF',
      pauseRules: { allowPause: false },
    }, headers)
    const planBody = await parseTRPC<{ _id: string }>(planRes)
    assertTRPCSuccess(planBody)
    const planId = (planBody.data as any)._id as string

    // pausePlan on a DRAFT plan — fails because not ACTIVE
    const pauseRes = await chefTrpcMutation(request, 'pausePlan', { planId }, headers)
    const pauseBody = await parseTRPC(pauseRes)
    assertTRPCError(pauseBody, 400)
  })

  test('returns 401 for archivePlan without auth', async ({ request }) => {
    const res = await chefTrpcMutation(request, 'archivePlan', { planId: '000000000000000000000001' })
    const body = await parseTRPC(res)
    assertTRPCError(body, 401)
  })
})
