import { chefProcedure } from '../trpc'
import { DateRangeInputSchema, resolveDateRange } from '../../utils/date-range'
import { Subscription } from '../../models/subscription.model'

export const getSubscriptionMetricsProcedure = chefProcedure
  .input(DateRangeInputSchema)
  .query(async ({ input, ctx }) => {
    const chefId = ctx.principal.userId
    const { from, to } = resolveDateRange(input)

    const [byStatusRaw, byPlanRaw] = await Promise.all([
      // 1. All-time count by status
      Subscription.aggregate([
        { $match: { chefId } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),

      // 2. Date-filtered count + revenue by planId
      Subscription.aggregate([
        { $match: { chefId, createdAt: { $gte: from, $lte: to } } },
        {
          $group: {
            _id: '$planId',
            count: { $sum: 1 },
            revenue: { $sum: { $divide: ['$priceSnapshot.amountCents', 100] } },
          },
        },
      ]),
    ])

    const byStatus: Record<string, number> = {}
    for (const entry of byStatusRaw) {
      byStatus[entry._id as string] = entry.count as number
    }

    const byPlan = byPlanRaw.map((p: any) => ({
      planId: p._id as string,
      count: p.count as number,
      revenue: p.revenue as number,
    }))

    return { byStatus, byPlan }
  })
