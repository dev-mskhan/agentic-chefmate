import { userProcedure } from '../trpc'
import { Order } from '../../models/order.model'
import { Subscription } from '../../models/subscription.model'
import { DashNotification } from '../../models/notification.model'
import { DashUserProfile } from '../../models/user-profile.model'
import { Eligibility } from '../../models/eligibility.model'
import { Review } from '../../models/review.model'

const ACTIVE_ORDER_STATUSES = ['CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED']

export const getUserDashboardOverviewProcedure = userProcedure.query(async ({ ctx }) => {
  const userId = ctx.principal.userId

  // Pending review count: eligibility docs for this user where no PUBLISHED review exists yet
  const getPendingReviewCount = async (): Promise<number> => {
    const eligibilities = await Eligibility.find({ customerId: userId }).select('orderId').lean()
    if (eligibilities.length === 0) return 0
    const orderIds = (eligibilities as any[]).map((e) => e.orderId)
    const reviewed = await Review.countDocuments({ customerId: userId, orderId: { $in: orderIds }, status: 'PUBLISHED' })
    return eligibilities.length - reviewed
  }

  const [
    recentOrderCount,
    activeSubscriptionCount,
    unreadNotificationCount,
    profile,
    pendingReviewCount,
  ] = await Promise.all([
    Order.countDocuments({ customerId: userId, status: { $in: ACTIVE_ORDER_STATUSES } }),
    Subscription.countDocuments({ customerId: userId, status: 'ACTIVE' }),
    DashNotification.countDocuments({ userId, readAt: null, status: 'delivered' }),
    DashUserProfile.findOne({ userId }).select('favorites').lean(),
    getPendingReviewCount(),
  ])

  const fav = (profile as any)?.favorites ?? {}
  return {
    recentOrderCount,
    activeSubscriptionCount,
    unreadNotificationCount,
    favoriteChefCount: (fav.chefIds ?? []).length,
    favoriteDishCount: (fav.dishIds ?? []).length,
    favoritePlanCount: (fav.planIds ?? []).length,
    pendingReviewCount,
  }
})
