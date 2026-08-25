import { test, expect, type APIRequestContext } from '@playwright/test'
import { setupUser, uniqueEmail } from '../../helpers/user'
import { setupActiveChef } from '../../helpers/chef'

const ADMIN_EMAIL = 'admin@chefmate.test'
const ADMIN_PASSWORD = 'AdminPass123!'
const ADMIN_PREFIX = '/api/v1/admin/trpc'

async function signIn(request: APIRequestContext, email: string, password: string) {
  const response = await request.post('/api/v1/auth/trpc/signin', {
    data: { email, password },
  })
  expect(response.status()).toBe(200)
}

async function adminGet(request: APIRequestContext, procedure: string, input?: Record<string, unknown>) {
  const response = await request.get(`${ADMIN_PREFIX}/${procedure}`, {
    params: input === undefined ? undefined : { input: JSON.stringify(input) },
  })
  const body = await response.json().catch(() => null)
  return { response, body }
}

async function adminPost(request: APIRequestContext, procedure: string, input: Record<string, unknown>) {
  const response = await request.post(`${ADMIN_PREFIX}/${procedure}`, { data: input })
  const body = await response.json().catch(() => null)
  return { response, body }
}

test.describe('Phase 12 — administrative boundaries through gateway', () => {
  test('rejects every administrative operation for a non-admin user', async ({ request }) => {
    await setupUser(request, uniqueEmail('admin-boundary-user'))
    const result = await adminGet(request, 'listUsers', { limit: 1 })
    expect(result.response.status()).toBe(403)
  })

  test('admin can inspect analytics and all operational query groups', async ({ request }) => {
    await signIn(request, ADMIN_EMAIL, ADMIN_PASSWORD)
    const queryGroups = [
      ['getAdminOverview'],
      ['getPlatformMetrics', { from: '2026-01-01T00:00:00.000Z', to: '2026-12-31T23:59:59.999Z' }],
      ['getPlatformRevenue', { from: '2026-01-01T00:00:00.000Z', to: '2026-12-31T23:59:59.999Z' }],
      ['getQualityFlags', { limit: 1 }],
      ['listPendingChefs', { limit: 1 }],
      ['listUsers', { limit: 1 }],
      ['listOrders', { limit: 1 }],
      ['listPayments', { limit: 1 }],
      ['listReviewsForModeration', { limit: 1 }],
      ['listPayouts', { chefId: '507f1f77bcf86cd799439011', limit: 1 }],
      ['listDisputes', { limit: 1 }],
      ['listAuditLogs', { limit: 1 }],
    ] as const

    for (const [procedure, input] of queryGroups) {
      const result = await adminGet(request, procedure, input)
      expect(result.response.status(), `${procedure} response`).toBe(200)
      expect(result.body?.result?.data, `${procedure} payload`).toBeDefined()
    }
  })

  test('admin can approve, suspend, and restore a chef, while non-admin is denied', async ({ request }) => {
    test.setTimeout(90_000)
    const chef = await setupActiveChef(request, uniqueEmail('admin-managed-chef'))
    await signIn(request, ADMIN_EMAIL, ADMIN_PASSWORD)

    const suspend = await adminPost(request, 'suspendChef', { chefId: chef.chefId, reason: 'E2E suspension' })
    expect(suspend.response.status()).toBe(200)
    const restore = await adminPost(request, 'restoreChef', { chefId: chef.chefId })
    expect(restore.response.status()).toBe(200)
    const approve = await adminPost(request, 'approveChef', { chefId: chef.chefId })
    expect(approve.response.status()).toBe(200)

    await setupUser(request, uniqueEmail('admin-boundary-second-user'))
    const denied = await adminPost(request, 'suspendChef', { chefId: chef.chefId, reason: 'Denied' })
    expect(denied.response.status()).toBe(403)
  })

  test('admin mutation boundaries return controlled authorization errors for missing targets', async ({ request }) => {
    await signIn(request, ADMIN_EMAIL, ADMIN_PASSWORD)
    const missingId = '507f1f77bcf86cd799439011'
    const mutations = [
      ['getUser', { userId: missingId }],
      ['getOrder', { orderId: missingId }],
      ['getPayment', { paymentId: missingId }],
      ['getChefForReview', { chefId: missingId }],
      ['getAuditLog', { auditId: missingId }],
      ['requestRefund', { paymentId: missingId, reason: 'E2E authorization check' }],
    ] as const

    for (const [procedure, input] of mutations) {
      const result = procedure === 'requestRefund'
        ? await adminPost(request, procedure, input)
        : await adminGet(request, procedure, input)
      expect([400, 404]).toContain(result.response.status())
    }
  })
})
