import { z } from 'zod'
import { chefProcedure } from '../trpc'
import { DateRangeInputSchema, resolveDateRange } from '../../utils/date-range'
import { Order } from '../../models/order.model'
import { EarningsLedger } from '../../models/earnings-ledger.model'

const dateFormatMap: Record<string, string> = {
  day: '%Y-%m-%d',
  week: '%Y-W%V',
  month: '%Y-%m',
}

export const getRevenueMetricsProcedure = chefProcedure
  .input(DateRangeInputSchema.extend({ groupBy: z.enum(['day', 'week', 'month']).default('day') }))
  .query(async ({ input, ctx }) => {
    const chefId = ctx.principal.userId
    const { from, to } = resolveDateRange(input)
    const fmt = dateFormatMap[input.groupBy]

    const [grossRevenueResult, earningsResult, refundsResult, trendRaw] = await Promise.all([
      // 1. Gross revenue from non-cancelled orders
      Order.aggregate([
        {
          $match: {
            chefId,
            createdAt: { $gte: from, $lte: to },
            status: { $nin: ['CANCELLED', 'PENDING'] },
          },
        },
        { $group: { _id: null, total: { $sum: '$pricing.total' } } },
      ]),

      // 2. Earnings ledger CREDIT: gross, fees, net
      EarningsLedger.aggregate([
        { $match: { chefId, type: 'CREDIT', createdAt: { $gte: from, $lte: to } } },
        {
          $group: {
            _id: null,
            grossEarnings: { $sum: { $divide: ['$grossAmountCents', 100] } },
            platformFees: { $sum: { $divide: ['$platformFeeCents', 100] } },
            netEarnings: { $sum: { $divide: ['$netAmountCents', 100] } },
          },
        },
      ]),

      // 3. Earnings ledger DEBIT: refunds
      EarningsLedger.aggregate([
        { $match: { chefId, type: 'DEBIT', createdAt: { $gte: from, $lte: to } } },
        { $group: { _id: null, total: { $sum: { $divide: ['$netAmountCents', 100] } } } },
      ]),

      // 4. Revenue trend by period (CREDIT)
      EarningsLedger.aggregate([
        { $match: { chefId, type: 'CREDIT', createdAt: { $gte: from, $lte: to } } },
        {
          $group: {
            _id: { $dateToString: { format: fmt, date: '$createdAt' } },
            grossRevenue: { $sum: { $divide: ['$grossAmountCents', 100] } },
            netEarnings: { $sum: { $divide: ['$netAmountCents', 100] } },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ])

    const trend = trendRaw.map((t: any) => ({
      period: t._id as string,
      grossRevenue: t.grossRevenue as number,
      netEarnings: t.netEarnings as number,
    }))

    return {
      grossRevenue: grossRevenueResult[0]?.total ?? 0,
      grossEarnings: earningsResult[0]?.grossEarnings ?? 0,
      platformFees: earningsResult[0]?.platformFees ?? 0,
      netEarnings: earningsResult[0]?.netEarnings ?? 0,
      refunds: refundsResult[0]?.total ?? 0,
      trend,
      tipsNotImplemented: true as const,
    }
  })
