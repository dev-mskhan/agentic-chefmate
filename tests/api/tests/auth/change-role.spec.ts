/**
 * Tests: POST /api/v1/auth/trpc/changeRole
 *
 * changeRole is a tRPC mutation (POST) — uses internalProcedure.
 * Input: { userId: string, newRole: 'USER' | 'CHEF' | 'ADMIN' }
 * Success: { userId, oldRole, newRole }
 *
 * IMPORTANT: changeRole currently uses internalProcedure = t.procedure (no middleware guard).
 * Protection is solely via the gateway stripping x-internal-secret.
 * These tests call auth-service directly, bypassing the gateway.
 *
 * Security note: internalProcedure should have a secret guard added in the future.
 * See fixtures/internal.ts for the INTERNAL_SECRET mechanism.
 */
import { test, expect } from '@playwright/test'
import { trpcMutation, parseTRPC } from '../../helpers/trpc'
import { assertTRPCSuccess, assertTRPCError } from '../../helpers/assertions'
import { createAndSigninUser } from '../../fixtures/auth'
import { changeRole } from '../../fixtures/internal'

test.describe('tRPC changeRole (internalProcedure)', () => {
  test('changes a user role from USER to CHEF', async ({ request }) => {
    const { userId } = await createAndSigninUser(request)
    const body = await changeRole(request, userId, 'CHEF')
    assertTRPCSuccess(body)
    expect(body.data!.oldRole).toBe('USER')
    expect(body.data!.newRole).toBe('CHEF')
    expect(body.data!.userId).toBe(userId)
  })

  test('changes a user role from CHEF to ADMIN', async ({ request }) => {
    const { userId } = await createAndSigninUser(request)
    await changeRole(request, userId, 'CHEF')
    const body = await changeRole(request, userId, 'ADMIN')
    assertTRPCSuccess(body)
    expect(body.data!.newRole).toBe('ADMIN')
  })

  test('returns 400 when userId is missing', async ({ request }) => {
    const res = await trpcMutation(request, 'changeRole', { newRole: 'CHEF' })
    const body = await parseTRPC(res)
    assertTRPCError(body, 400)
  })

  test('returns 400 when newRole is invalid enum value', async ({ request }) => {
    const res = await trpcMutation(request, 'changeRole', { userId: 'any-id', newRole: 'SUPERADMIN' })
    const body = await parseTRPC(res)
    assertTRPCError(body, 400)
  })

  test('returns 404 when userId does not exist', async ({ request }) => {
    const body = await changeRole(request, '000000000000000000000001', 'CHEF')
    assertTRPCError(body, 404)
  })

  test('returns 400 when body is empty', async ({ request }) => {
    const res = await trpcMutation(request, 'changeRole', {})
    const body = await parseTRPC(res)
    assertTRPCError(body, 400)
  })
})
