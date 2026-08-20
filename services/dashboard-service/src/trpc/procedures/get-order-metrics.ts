import { z } from 'zod'
import { chefProcedure } from '../trpc'
import { DateRangeInputSchema, resolveDateRange } from '../../utils/date-range'
import { Order } from '../../models/order.model'

const dateFormatMap: Record<string, string> = {
  day: '%Y-%m-%d',
  week: '%Y-W%V',
  month: '%Y-%m',
}

export const getOrderMetricsProcedure = chefProcedure
  .input(DateRangeInputSchema.extend({ groupBy: z.enum(['day', 'week', 'month']).default('day') }))
  .query(async ({ input, ctx }) => {
    const chefId = ctx.principal.userId
    const { from, to } = resolveDateRange(input)
    const fmt = dateFormatMap[input.groupBy]

    const [byStatusRaw, trendRaw, recentOrders] = await Promise.all([
      // 1. Count by status
      Order.aggregate([
        { $match: { chefId, createdAt: { $gte: from, $lte: to } } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),

      // 2. Trend by period
      Order.aggregate([
        { $match: { chefId, createdAt: { $gte: from, $lte: to } } },
        {
          $group: {
            _id: { $dateToString: { format: fmt, date: '$createdAt' } },
            orderCount: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      // 3. Recent 10 orders
      Order.aggregate([
        { $match: { chefId, createdAt: { $gte: from, $lte: to } } },
        { $sort: { createdAt: -1 } },
        { $limit: 10 },
        {
          $project: {
            _id: 1,
            status: 1,
            orderType: 1,
            total: '$pricing.total',
            currency: '$pricing.currency',
            createdAt: 1,
            itemCount: { $size: { $ifNull: ['$items', []] } },
          },
        },
      ]),
    ])

    const byStatus: Record<string, number> = {}
    for (const entry of byStatusRaw) {
      byStatus[entry._id as string] = entry.count as number
    }

    const trend = trendRaw.map((t: any) => ({ period: t._id as string, orderCount: t.orderCount as number }))

    return { byStatus, trend, recentOrders }
  })
