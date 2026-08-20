import { router } from './trpc'

// ── Analytics ─────────────────────────────────────────────────────────────────
import { getAdminOverviewProcedure }         from './procedures/get-admin-overview'
import { getPlatformMetricsProcedure }        from './procedures/get-platform-metrics'
import { getPlatformRevenueProcedure }        from './procedures/get-platform-revenue'
import { getQualityFlagsProcedure }           from './procedures/get-quality-flags'

// ── Chef administration ───────────────────────────────────────────────────────
import { listPendingChefsProcedure }          from './procedures/list-pending-chefs'
import { getChefForReviewProcedure }          from './procedures/get-chef-for-review'
import { approveChefProcedure }               from './procedures/approve-chef'
import { rejectChefProcedure }                from './procedures/reject-chef'
import { suspendChefProcedure }               from './procedures/suspend-chef'
import { restoreChefProcedure }               from './procedures/restore-chef'

// ── User administration ───────────────────────────────────────────────────────
import { listUsersProcedure }                 from './procedures/list-users'
import { getUserProcedure }                   from './procedures/get-user'
import { suspendUserProcedure }               from './procedures/suspend-user'
import { restoreUserProcedure }               from './procedures/restore-user'

// ── Review moderation ─────────────────────────────────────────────────────────
import { listReviewsForModerationProcedure }  from './procedures/list-reviews-for-moderation'
import { adminModerateReviewProcedure }       from './procedures/admin-moderate-review'

// ── Order oversight ───────────────────────────────────────────────────────────
import { listOrdersProcedure }                from './procedures/list-orders'
import { getOrderProcedure }                  from './procedures/get-order'

// ── Payment oversight ─────────────────────────────────────────────────────────
import { listPaymentsProcedure }              from './procedures/list-payments'
import { getPaymentProcedure }                from './procedures/get-payment'

// ── Refunds + disputes ────────────────────────────────────────────────────────
import { requestRefundProcedure }             from './procedures/request-refund'
import { listDisputesProcedure }              from './procedures/list-disputes'

// ── Payout monitoring ─────────────────────────────────────────────────────────
import { listPayoutsProcedure }               from './procedures/list-payouts'
import { getChefBalanceProcedure }            from './procedures/get-chef-balance'

// ── Audit log ─────────────────────────────────────────────────────────────────
import { listAuditLogsProcedure }             from './procedures/list-audit-logs'
import { getAuditLogProcedure }               from './procedures/get-audit-log'

export const appRouter = router({
  // Analytics
  getAdminOverview:   getAdminOverviewProcedure,
  getPlatformMetrics: getPlatformMetricsProcedure,
  getPlatformRevenue: getPlatformRevenueProcedure,
  getQualityFlags:    getQualityFlagsProcedure,

  // Chef admin
  listPendingChefs:   listPendingChefsProcedure,
  getChefForReview:   getChefForReviewProcedure,
  approveChef:        approveChefProcedure,
  rejectChef:         rejectChefProcedure,
  suspendChef:        suspendChefProcedure,
  restoreChef:        restoreChefProcedure,

  // User admin
  listUsers:    listUsersProcedure,
  getUser:      getUserProcedure,
  suspendUser:  suspendUserProcedure,
  restoreUser:  restoreUserProcedure,

  // Review moderation
  listReviewsForModeration: listReviewsForModerationProcedure,
  adminModerateReview:      adminModerateReviewProcedure,

  // Order oversight
  listOrders: listOrdersProcedure,
  getOrder:   getOrderProcedure,

  // Payment oversight
  listPayments: listPaymentsProcedure,
  getPayment:   getPaymentProcedure,

  // Refunds + disputes
  requestRefund: requestRefundProcedure,
  listDisputes:  listDisputesProcedure,

  // Payout monitoring
  listPayouts:    listPayoutsProcedure,
  getChefBalance: getChefBalanceProcedure,

  // Audit log
  listAuditLogs: listAuditLogsProcedure,
  getAuditLog:   getAuditLogProcedure,
})

export type AppRouter = typeof appRouter
