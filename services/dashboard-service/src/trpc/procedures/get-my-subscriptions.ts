import { z } from 'zod'
import { userProcedure } from '../trpc'
import { Subscription } from '../../models/subscription.model'

export const getMySubscriptionsProcedure = userProcedure
  .input(z.object({ status: z.enum(['PENDING', 'ACTIVE', 'PAUSED', 'CANCELLED', 'PAST_DUE', 'COMPLETED']).optional() }))
  .query(async ({ ctx, input }) => {
    const userId = ctx.principal.userId
    const matchFilter: Record<string, unknown> = { customerId: userId }
    if (input.status) matchFilter['status'] = input.status

    const subscriptions = await Subscription.aggregate([
      { $match: matchFilter },
      { $sort: { createdAt: -1 } },
      {
        $lookup: {
          from:         'chefprofiles',
          localField:   'chefId',
          foreignField: 'userId',
          as:           '_chef',
        },
      },
      {
        $project: {
          _id:             1,
          chefId:          1,
          planId:          1,
          status:          1,
          priceSnapshot:   1,
          frequency:       1,
          createdAt:       1,
          chefDisplayName: { $arrayElemAt: ['$_chef.displayName', 0] },
        },
      },
    ])

    return subscriptions
  })
