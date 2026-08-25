import { test, expect, type APIRequestContext } from '@playwright/test'
import { setupActiveChef } from '../../helpers/chef'
import { setupUser, uniqueEmail } from '../../helpers/user'

type DashboardRole = 'chef' | 'user'

async function dashboardGet(
  request: APIRequestContext,
  role: DashboardRole,
  procedure: string,
  input?: Record<string, unknown>,
) {
  const prefix = role === 'chef' ? '/api/v1/chef-dashboard/trpc' : '/api/v1/user-dashboard/trpc'
  const response = await request.get(`${prefix}/${procedure}`, {
    params: input === undefined ? undefined : { input: JSON.stringify(input) },
  })
  const body = await response.json().catch(() => null)
  return { response, body, data: body?.result?.data }
}

test.describe('Phase 11 — dashboard and analytics through gateway', () => {
  test('serves all chef dashboard and analytics query groups', async ({ request }) => {
    test.setTimeout(90_000)
    await setupActiveChef(request, uniqueEmail('dashboard-chef'))
    const dateRange = { period: '30d' }

    const procedures = [
      'getDashboardOverview',
      'getEarningsSummary',
      'getRevenueMetrics',
      'getOrderMetrics',
      'getRatingMetrics',
      'getSubscriptionMetrics',
      'getPopularDishes',
      'getPopularPlans',
      'getPayoutHistory',
      'getStatement',
      'getCustomerMetrics',
    ] as const

    for (const procedure of procedures) {
      const result = await dashboardGet(request, 'chef', procedure, dateRange)
      expect(result.response.status(), `${procedure} response`).toBe(200)
      expect(result.body?.result?.data, `${procedure} payload`).toBeDefined()
    }
  })

  test('serves all customer dashboard query groups', async ({ request }) => {
    await setupUser(request, uniqueEmail('dashboard-user'))
    const cursor = { limit: 10 }

    const inputProcedures = [
      'getMyOrders',
      'getMyPayments',
      'getMyReviews',
    ] as const
    for (const procedure of inputProcedures) {
      const result = await dashboardGet(request, 'user', procedure, cursor)
      expect(result.response.status(), `${procedure} response`).toBe(200)
      expect(result.body?.result?.data, `${procedure} payload`).toBeDefined()
    }

    const emptyInputProcedures = [
      'getUserDashboardOverview',
      'getMySubscriptions',
      'getMyFavorites',
      'getMyNotificationSummary',
    ] as const
    for (const procedure of emptyInputProcedures) {
      const result = await dashboardGet(request, 'user', procedure, procedure === 'getMyFavorites' ? { enrichChefNames: false } : {})
      expect(result.response.status(), `${procedure} response`).toBe(200)
      expect(result.body?.result?.data, `${procedure} payload`).toBeDefined()
    }
  })
})
