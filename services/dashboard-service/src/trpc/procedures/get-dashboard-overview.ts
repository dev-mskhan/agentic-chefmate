import { chefProcedure } from '../trpc'
import { DateRangeInputSchema, resolveDateRange } from '../../utils/date-range'
import { Order } from '../../models/order.model'
import { EarningsLedger } from '../../models/earnings-ledger.model'
import { Subscription } from '../../models/subscription.model'
import { ChefProfile } from '../../models/chef-profile.model'

export const getDashboardOverviewProcedure = chefProcedure
  .input(DateRangeInputSchema)
  .query(async ({ input, ctx }) => {
    const chefId = ctx.principal.userId
    const { from, to } = resolveDateRange(input)

    const [
      orderCountResult,
      grossRevenueResult,
      netEarningsResult,
      availableBalanceResult,
      activeSubscriptions,
      chefProfile,
    ] = await Promise.all([
      // 1. Order count in date range
      Order.countDocuments({ chefId, createdAt: { $gte: from, $lte: to } }),

      // 2. Gross revenue from non-cancelled orders in date range
      Order.aggregate([
        {
          $match: {
            chefId,
            createdAt: { $gte: from, $lte: to },
            status: { $in: ['CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED'] },
          },
        },
        { $group: { _id: null, gross: { $sum: '$pricing.total' }, currency: { $first: '$pricing.currency' } } },
      ]),

      // 3. Net earnings (CREDIT) in date range
      EarningsLedger.aggregate([
        { $match: { chefId, type: 'CREDIT', createdAt: { $gte: from, $lte: to } } },
        { $group: { _id: null, net: { $sum: { $divide: ['$netAmountCents', 100] } } } },
      ]),

      // 4. Available balance (all-time, status AVAILABLE)
      EarningsLedger.aggregate([
        { $match: { chefId, status: 'AVAILABLE' } },
        { $group: { _id: null, balance: { $sum: { $divide: ['$netAmountCents', 100] } } } },
      ]),

      // 5. Active subscriptions
      Subscription.countDocuments({ chefId, status: 'ACTIVE' }),

      // 6. Chef profile for ratings
      ChefProfile.findOne({ userId: chefId }).select('averageRating totalReviews').lean(),
    ])

    return {
      orderCount: orderCountResult,
      grossRevenue: grossRevenueResult[0]?.gross ?? 0,
      netEarnings: netEarningsResult[0]?.net ?? 0,
      availableBalance: availableBalanceResult[0]?.balance ?? 0,
      activeSubscriptions,
      averageRating: (chefProfile as any)?.averageRating ?? 0,
      totalReviews: (chefProfile as any)?.totalReviews ?? 0,
      currency: grossRevenueResult[0]?.currency ?? 'USD',
      tipsNotImplemented: true as const,
    }
  })
