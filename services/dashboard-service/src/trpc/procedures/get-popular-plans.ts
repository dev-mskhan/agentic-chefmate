import { z } from 'zod'
import { chefProcedure } from '../trpc'
import { DateRangeInputSchema, resolveDateRange } from '../../utils/date-range'
import { Subscription } from '../../models/subscription.model'

export const getPopularPlansProcedure = chefProcedure
  .input(DateRangeInputSchema.extend({ limit: z.number().int().min(1).max(50).default(10) }))
  .query(async ({ input, ctx }) => {
    const chefId = ctx.principal.userId
    const { from, to } = resolveDateRange(input)

    const results = await Subscription.aggregate([
      { $match: { chefId, createdAt: { $gte: from, $lte: to } } },
      {
        $group: {
          _id: '$planId',
          subscriberCount: { $sum: 1 },
          revenue: { $sum: { $divide: ['$priceSnapshot.amountCents', 100] } },
        },
      },
      { $sort: { subscriberCount: -1 } },
      { $limit: input.limit },
    ])

    return results.map((r: any) => ({
      planId: r._id as string,
      subscriberCount: r.subscriberCount as number,
      revenue: r.revenue as number,
    }))
  })
