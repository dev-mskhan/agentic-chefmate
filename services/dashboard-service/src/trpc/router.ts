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
import { getUserDashboardOverviewProcedure } from './procedures/get-user-dashboard-overview'
import { getMyOrdersProcedure }              from './procedures/get-my-orders'
import { getMyOrderProcedure }               from './procedures/get-my-order'
import { getMySubscriptionsProcedure }       from './procedures/get-my-subscriptions'
import { getMyPaymentsProcedure }            from './procedures/get-my-payments'
import { getMyReviewsProcedure }             from './procedures/get-my-reviews'
import { getMyFavoritesProcedure }           from './procedures/get-my-favorites'
import { getMyNotificationSummaryProcedure } from './procedures/get-my-notification-summary'

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
  // ── User Dashboard procedures ─────────────────────────────────────────────
  getUserDashboardOverview:    getUserDashboardOverviewProcedure,
  getMyOrders:                 getMyOrdersProcedure,
  getMyOrder:                  getMyOrderProcedure,
  getMySubscriptions:          getMySubscriptionsProcedure,
  getMyPayments:               getMyPaymentsProcedure,
  getMyReviews:                getMyReviewsProcedure,
  getMyFavorites:              getMyFavoritesProcedure,
  getMyNotificationSummary:    getMyNotificationSummaryProcedure,
})

export type AppRouter = typeof appRouter
