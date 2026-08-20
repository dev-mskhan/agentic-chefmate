import { chefProcedure } from '../trpc'
import { DateRangeInputSchema, resolveDateRange } from '../../utils/date-range'
import { EarningsLedger } from '../../models/earnings-ledger.model'

export const getEarningsSummaryProcedure = chefProcedure
  .input(DateRangeInputSchema)
  .query(async ({ input, ctx }) => {
    const chefId = ctx.principal.userId
    const { from, to } = resolveDateRange(input)

    const [creditResult, debitResult, availableResult, pendingResult, transferredResult] = await Promise.all([
      // 1. Total credited (CREDIT, date-filtered)
      EarningsLedger.aggregate([
        { $match: { chefId, type: 'CREDIT', createdAt: { $gte: from, $lte: to } } },
        { $group: { _id: null, total: { $sum: { $divide: ['$netAmountCents', 100] } } } },
      ]),

      // 2. Total debited (DEBIT, date-filtered)
      EarningsLedger.aggregate([
        { $match: { chefId, type: 'DEBIT', createdAt: { $gte: from, $lte: to } } },
        { $group: { _id: null, total: { $sum: { $divide: ['$netAmountCents', 100] } } } },
      ]),

      // 3. Available balance (all-time)
      EarningsLedger.aggregate([
        { $match: { chefId, status: 'AVAILABLE' } },
        { $group: { _id: null, total: { $sum: { $divide: ['$netAmountCents', 100] } } } },
      ]),

      // 4. Pending balance (all-time)
      EarningsLedger.aggregate([
        { $match: { chefId, status: 'PENDING' } },
        { $group: { _id: null, total: { $sum: { $divide: ['$netAmountCents', 100] } } } },
      ]),

      // 5. Transferred balance (all-time)
      EarningsLedger.aggregate([
        { $match: { chefId, status: 'TRANSFERRED' } },
        { $group: { _id: null, total: { $sum: { $divide: ['$netAmountCents', 100] } } } },
      ]),
    ])

    return {
      totalCredited: creditResult[0]?.total ?? 0,
      totalDebited: debitResult[0]?.total ?? 0,
      available: availableResult[0]?.total ?? 0,
      pending: pendingResult[0]?.total ?? 0,
      transferred: transferredResult[0]?.total ?? 0,
    }
  })
