import { router } from './trpc'
import { getDashboardOverviewProcedure }   from './procedures/get-dashboard-overview'
import { getOrderMetricsProcedure }        from './procedures/get-order-metrics'
import { getRevenueMetricsProcedure }      from './procedures/get-revenue-metrics'
import { getEarningsSummaryProcedure }     from './procedures/get-earnings-summary'
import { getPayoutHistoryProcedure }       from './procedures/get-payout-history'
import { getSubscriptionMetricsProcedure } from './procedures/get-subscription-metrics'
import { getPopularDishesProcedure }       from './procedures/get-popular-dishes'
import { getPopularPlansProcedure }        from './procedures/get-popular-plans'
import { getRatingMetricsProcedure }       from './procedures/get-rating-metrics'
import { getCustomerMetricsProcedure }     from './procedures/get-customer-metrics'
import { getStatementProcedure }           from './procedures/get-statement'

export const appRouter = router({
  getDashboardOverview:   getDashboardOverviewProcedure,
  getOrderMetrics:        getOrderMetricsProcedure,
  getRevenueMetrics:      getRevenueMetricsProcedure,
  getEarningsSummary:     getEarningsSummaryProcedure,
  getPayoutHistory:       getPayoutHistoryProcedure,
  getSubscriptionMetrics: getSubscriptionMetricsProcedure,
  getPopularDishes:       getPopularDishesProcedure,
  getPopularPlans:        getPopularPlansProcedure,
  getRatingMetrics:       getRatingMetricsProcedure,
  getCustomerMetrics:     getCustomerMetricsProcedure,
  getStatement:           getStatementProcedure,
})

export type AppRouter = typeof appRouter
