import { z } from 'zod'
import { userProcedure } from '../trpc'
import { Order } from '../../models/order.model'
import { CursorInputSchema, buildCursorFilter, resolveNextCursor } from '../../utils/cursor-pagination'

export const getMyOrdersProcedure = userProcedure
  .input(CursorInputSchema.extend({ status: z.string().optional() }))
  .query(async ({ ctx, input }) => {
    const userId = ctx.principal.userId
    const matchFilter: Record<string, unknown> = {
      customerId: userId,
      ...buildCursorFilter(input.cursor),
    }
    if (input.status) matchFilter['status'] = input.status

    const orders = await Order.aggregate([
      { $match: matchFilter },
      { $sort: { createdAt: -1 } },
      { $limit: input.limit },
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
          _id:            1,
          status:         1,
          orderType:      1,
          'pricing.total':    1,
          'pricing.currency': 1,
          createdAt:      1,
          itemCount:      { $size: { $ifNull: ['$items', []] } },
          chefDisplayName: { $arrayElemAt: ['$_chef.displayName', 0] },
        },
      },
    ])

    return {
      orders,
      nextCursor: resolveNextCursor(orders as any[], input.limit),
    }
  })
