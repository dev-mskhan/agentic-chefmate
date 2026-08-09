/**
 * Tests: getMe and updateMe procedures
 *
 * getMe   → tRPC query  GET /trpc/getMe
 * updateMe → tRPC mutation POST /trpc/updateMe
 *
 * Success (getMe):  returns full UserProfile document
 * Success (updateMe): returns updated profile; creates it if it doesn't exist (upsert)
 * Auth: requires X-User-Id, X-User-Role, X-User-Email headers
 */
import { test, expect } from '@playwright/test'
import { userTrpcQuery, userTrpcMutation, fakeAuthHeaders, createProfileViaUpdateMe } from '../../fixtures/user'
import { parseTRPC } from '../../helpers/trpc'
import { assertTRPCSuccess, assertTRPCError } from '../../helpers/assertions'

test.describe('tRPC getMe', () => {
  test('returns 401 when no auth headers provided', async ({ request }) => {
    const res = await userTrpcQuery(request, 'getMe')
    const body = await parseTRPC(res)
    assertTRPCError(body, 401)
  })

  test('returns 404 when profile does not exist', async ({ request }) => {
    const headers = fakeAuthHeaders()
    const res = await userTrpcQuery(request, 'getMe', undefined, headers)
    const body = await parseTRPC(res)
    assertTRPCError(body, 404)
  })

  test('returns profile after updateMe creates it', async ({ request }) => {
    const headers = fakeAuthHeaders()
    await createProfileViaUpdateMe(request, headers, { firstName: 'Ali', lastName: 'Khan' })

    const res = await userTrpcQuery(request, 'getMe', undefined, headers)
    const body = await parseTRPC<{
      userId: string
      firstName: string
      lastName: string
      spiceLevel: string
      dietaryPreferences: string[]
    }>(res)

    assertTRPCSuccess(body)
    expect(body.data!.firstName).toBe('Ali')
    expect(body.data!.lastName).toBe('Khan')
    expect(body.data!.spiceLevel).toBe('MEDIUM')
    expect(body.data!.dietaryPreferences).toContain('HALAL')
  })
})

test.describe('tRPC updateMe', () => {
  test('returns 401 when no auth headers provided', async ({ request }) => {
    const res = await userTrpcMutation(request, 'updateMe', { firstName: 'Ali', lastName: 'Khan' })
    const body = await parseTRPC(res)
    assertTRPCError(body, 401)
  })

  test('creates profile on first call (upsert)', async ({ request }) => {
    const headers = fakeAuthHeaders()
    const res = await userTrpcMutation(
      request,
      'updateMe',
      { firstName: 'Fatima', lastName: 'Ahmed' },
      headers,
    )
    const body = await parseTRPC<{ firstName: string; lastName: string }>(res)

    assertTRPCSuccess(body)
    expect(body.data!.firstName).toBe('Fatima')
    expect(body.data!.lastName).toBe('Ahmed')
  })

  test('updates individual fields', async ({ request }) => {
    const headers = fakeAuthHeaders()
    await createProfileViaUpdateMe(request, headers, { firstName: 'Omar', lastName: 'Farooq' })

    const res = await userTrpcMutation(request, 'updateMe', { phone: '+923001234567' }, headers)
    const body = await parseTRPC<{ phone?: string }>(res)

    assertTRPCSuccess(body)
    expect(body.data!.phone).toBe('+923001234567')
  })

  test('returns 400 on invalid profileImage URL', async ({ request }) => {
    const headers = fakeAuthHeaders()
    const res = await userTrpcMutation(
      request,
      'updateMe',
      { profileImage: 'not-a-url' },
      headers,
    )
    const body = await parseTRPC(res)
    assertTRPCError(body, 400)
  })
})
