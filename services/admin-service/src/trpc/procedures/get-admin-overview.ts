import { adminProcedure } from '../trpc'
import { AdminChefProfile }   from '../../models/chef-profile.model'
import { AdminOrder }         from '../../models/order.model'
import { AdminUser }          from '../../models/user.model'
import { AdminSubscription }  from '../../models/subscription.model'
import { AdminReview }        from '../../models/review.model'

export const getAdminOverviewProcedure = adminProcedure.query(async () => {
  const [
    totalUsers,
    pendingChefs,
    activeChefs,
    suspendedChefs,
    totalOrders,
    completedOrders,
    cancelledOrders,
    activeSubscriptions,
    publishedReviews,
  ] = await Promise.all([
    AdminUser.countDocuments({}),
    AdminChefProfile.countDocuments({ verificationStatus: 'PENDING' }),
    AdminChefProfile.countDocuments({ verificationStatus: 'ACTIVE' }),
    AdminChefProfile.countDocuments({ verificationStatus: 'SUSPENDED' }),
    AdminOrder.countDocuments({}),
    AdminOrder.countDocuments({ status: 'DELIVERED' }),
    AdminOrder.countDocuments({ status: 'CANCELLED' }),
    AdminSubscription.countDocuments({ status: 'ACTIVE' }),
    AdminReview.countDocuments({ status: 'PUBLISHED' }),
  ])
  return { totalUsers, pendingChefs, activeChefs, suspendedChefs, totalOrders, completedOrders, cancelledOrders, activeSubscriptions, publishedReviews }
})
