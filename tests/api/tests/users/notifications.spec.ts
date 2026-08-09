/**
 * Tests: notification preferences procedures
 *
 * getNotifPrefs    → GET  /trpc/getNotifPrefs
 * updateNotifPrefs → POST /trpc/updateNotifPrefs
 *
 * Auth: requires X-User-* headers
 */
import { test, expect } from '@playwright/test'
import { userTrpcQuery, userTrpcMutation, fakeAuthHeaders, createProfileViaUpdateMe } from '../../fixtures/user'
import { parseTRPC } from '../../helpers/trpc'
import { assertTRPCSuccess, assertTRPCError } from '../../helpers/assertions'

test.describe('tRPC notification preferences', () => {
  test('returns 401 without auth headers', async ({ request }) => {
    const res = await userTrpcQuery(request, 'getNotifPrefs')
    const body = await parseTRPC(res)
    assertTRPCError(body, 401)
  })

  test('getNotifPrefs returns default values', async ({ request }) => {
    const headers = fakeAuthHeaders()
    await createProfileViaUpdateMe(request, headers, { firstName: 'Notif', lastName: 'Test' })

    const res = await userTrpcQuery(request, 'getNotifPrefs', undefined, headers)
    const body = await parseTRPC<{
      orderUpdates: boolean
      promotions: boolean
      chefMessages: boolean
      email: boolean
    }>(res)

    assertTRPCSuccess(body)
    expect(body.data!.orderUpdates).toBe(true)
    expect(body.data!.promotions).toBe(false)
    expect(body.data!.chefMessages).toBe(true)
    expect(body.data!.email).toBe(true)
  })

  test('updateNotifPrefs updates promotions flag', async ({ request }) => {
    const headers = fakeAuthHeaders()
    await createProfileViaUpdateMe(request, headers, { firstName: 'Promo', lastName: 'Test' })

    const res = await userTrpcMutation(
      request,
      'updateNotifPrefs',
      { promotions: true },
      headers,
    )
    const body = await parseTRPC<{ promotions: boolean }>(res)

    assertTRPCSuccess(body)
    expect(body.data!.promotions).toBe(true)
  })

  test('updateNotifPrefs updates multiple flags at once', async ({ request }) => {
    const headers = fakeAuthHeaders()
    await createProfileViaUpdateMe(request, headers, { firstName: 'Multi', lastName: 'Notif' })

    const res = await userTrpcMutation(
      request,
      'updateNotifPrefs',
      { orderUpdates: false, email: false },
      headers,
    )
    const body = await parseTRPC<{ orderUpdates: boolean; email: boolean }>(res)

    assertTRPCSuccess(body)
    expect(body.data!.orderUpdates).toBe(false)
    expect(body.data!.email).toBe(false)
  })

  test('updateNotifPrefs returns 400 for non-boolean value', async ({ request }) => {
    const headers = fakeAuthHeaders()
    await createProfileViaUpdateMe(request, headers, { firstName: 'Bad', lastName: 'Notif' })

    const res = await userTrpcMutation(
      request,
      'updateNotifPrefs',
      { orderUpdates: 'yes' }, // invalid — should be boolean
      headers,
    )
    const body = await parseTRPC(res)
    assertTRPCError(body, 400)
  })
})
