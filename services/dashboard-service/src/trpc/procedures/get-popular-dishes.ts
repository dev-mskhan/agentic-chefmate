import { z } from 'zod'
import { chefProcedure } from '../trpc'
import { DateRangeInputSchema, resolveDateRange } from '../../utils/date-range'
import { Order } from '../../models/order.model'

export const getPopularDishesProcedure = chefProcedure
  .input(DateRangeInputSchema.extend({ limit: z.number().int().min(1).max(50).default(10) }))
  .query(async ({ input, ctx }) => {
    const chefId = ctx.principal.userId
    const { from, to } = resolveDateRange(input)

    const results = await Order.aggregate([
      { $match: { chefId, createdAt: { $gte: from, $lte: to } } },
      { $unwind: '$items' },
      {
        $group: {
          _id: { dishId: '$items.dishId', name: '$items.name' },
          orderCount: { $sum: '$items.quantity' },
          revenue: { $sum: '$items.subtotal' },
        },
      },
      { $sort: { orderCount: -1 } },
      { $limit: input.limit },
    ])

    return results.map((r: any) => ({
      dishId: r._id.dishId as string,
      name: r._id.name as string,
      orderCount: r.orderCount as number,
      revenue: r.revenue as number,
    }))
  })
