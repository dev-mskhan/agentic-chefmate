/**
 * Tests: exportData procedure
 *
 * exportData → GET /trpc/exportData
 *
 * Rate limited: max 1 export per 60-minute window.
 * Returns full UserProfile document.
 *
 * Auth: requires X-User-* headers
 */
import { test, expect } from '@playwright/test'
import { userTrpcQuery, fakeAuthHeaders, createProfileViaUpdateMe } from '../../fixtures/user'
import { parseTRPC } from '../../helpers/trpc'
import { assertTRPCSuccess, assertTRPCError } from '../../helpers/assertions'

test.describe('tRPC exportData', () => {
  test('returns 401 without auth headers', async ({ request }) => {
    const res = await userTrpcQuery(request, 'exportData')
    const body = await parseTRPC(res)
    assertTRPCError(body, 401)
  })

  test('returns 404 when profile does not exist', async ({ request }) => {
    const headers = fakeAuthHeaders()
    const res = await userTrpcQuery(request, 'exportData', undefined, headers)
    const body = await parseTRPC(res)
    assertTRPCError(body, 404)
  })

  test('first export succeeds and returns full profile', async ({ request }) => {
    const headers = fakeAuthHeaders()
    await createProfileViaUpdateMe(request, headers, { firstName: 'Export', lastName: 'User' })

    const res = await userTrpcQuery(request, 'exportData', undefined, headers)
    const body = await parseTRPC<{
      userId: string
      firstName: string
      lastName: string
      addresses: unknown[]
    }>(res)

    assertTRPCSuccess(body)
    expect(body.data!.firstName).toBe('Export')
    expect(body.data!.lastName).toBe('User')
    expect(Array.isArray(body.data!.addresses)).toBe(true)
  })

  test('second export in same window returns 429', async ({ request }) => {
    // Each fakeAuthHeaders call creates a unique userId, so rate limit is per-user.
    const headers = fakeAuthHeaders()
    await createProfileViaUpdateMe(request, headers, { firstName: 'Rate', lastName: 'Limit' })

    // First export — allowed
    const firstRes = await userTrpcQuery(request, 'exportData', undefined, headers)
    const firstBody = await parseTRPC(firstRes)
    assertTRPCSuccess(firstBody)

    // Second export in same window — should be rate-limited
    const secondRes = await userTrpcQuery(request, 'exportData', undefined, headers)
    const secondBody = await parseTRPC(secondRes)
    assertTRPCError(secondBody, 429)
  })
})
