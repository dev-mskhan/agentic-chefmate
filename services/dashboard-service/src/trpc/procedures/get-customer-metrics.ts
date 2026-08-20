import { chefProcedure } from '../trpc'
import { DateRangeInputSchema, resolveDateRange } from '../../utils/date-range'
import { Order } from '../../models/order.model'

export const getCustomerMetricsProcedure = chefProcedure
  .input(DateRangeInputSchema)
  .query(async ({ input, ctx }) => {
    const chefId = ctx.principal.userId
    const { from, to } = resolveDateRange(input)

    const results = await Order.aggregate([
      { $match: { chefId, createdAt: { $gte: from, $lte: to } } },
      // First stage: group by customer
      {
        $group: {
          _id: '$customerId',
          orderCount: { $sum: 1 },
          totalSpend: { $sum: '$pricing.total' },
        },
      },
      // Second stage: aggregate across all customers
      {
        $group: {
          _id: null,
          uniqueCustomers: { $sum: 1 },
          repeatCustomers: { $sum: { $cond: [{ $gt: ['$orderCount', 1] }, 1, 0] } },
          totalRevenue: { $sum: '$totalSpend' },
        },
      },
    ])

    const data = results[0]
    if (!data) {
      return { uniqueCustomers: 0, repeatCustomers: 0, repeatRate: 0, avgLtv: 0 }
    }

    const uniqueCustomers = data.uniqueCustomers as number
    const repeatCustomers = data.repeatCustomers as number
    const totalRevenue = data.totalRevenue as number

    return {
      uniqueCustomers,
      repeatCustomers,
      repeatRate: uniqueCustomers > 0 ? repeatCustomers / uniqueCustomers : 0,
      avgLtv: uniqueCustomers > 0 ? totalRevenue / uniqueCustomers : 0,
    }
  })
