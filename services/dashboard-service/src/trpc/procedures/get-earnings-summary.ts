import { chefProcedure } from '../trpc'
import { DateRangeInputSchema, resolveDateRange } from '../../utils/date-range'
import { EarningsLedger } from '../../models/earnings-ledger.model'

export const getEarningsSummaryProcedure = chefProcedure
  .input(DateRangeInputSchema)
  .query(async ({ input, ctx }) => {
    const chefId = ctx.principal.userId
    const { from, to } = resolveDateRange(input)

    const [creditResult, debitResult, availableResult, pendingResult, transferredResult, heldResult, releasedResult] = await Promise.all([
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
        { $match: { chefId, status: { $in: ['AVAILABLE', 'PENDING'] } } },
        {
          $group: {
            _id: null,
            total: {
              $sum: {
                $cond: [
                  { $or: [{ $eq: ['$type', 'CREDIT'] }, { $eq: ['$type', 'HOLD_RELEASE'] }] },
                  { $cond: [{ $eq: ['$status', 'AVAILABLE'] }, '$netAmountCents', 0] },
                  { $cond: [{ $eq: ['$type', 'DEBIT'] }, { $multiply: ['$netAmountCents', -1] }, { $multiply: ['$netAmountCents', -1] }] },
                ],
              },
            },
          },
        },
        { $project: { total: { $divide: ['$total', 100] } } },
      ]),

      // 4. Pending balance (all-time)
      EarningsLedger.aggregate([
        { $match: { chefId, status: 'PENDING', type: 'CREDIT' } },
        { $group: { _id: null, total: { $sum: { $divide: ['$netAmountCents', 100] } } } },
      ]),

      // 5. Transferred balance (all-time)
      EarningsLedger.aggregate([
        { $match: { chefId, status: 'TRANSFERRED' } },
        { $group: { _id: null, total: { $sum: { $divide: ['$netAmountCents', 100] } } } },
      ]),

      EarningsLedger.aggregate([
        { $match: { chefId, type: 'HOLD', createdAt: { $gte: from, $lte: to } } },
        { $group: { _id: null, total: { $sum: { $divide: ['$netAmountCents', 100] } } } },
      ]),

      EarningsLedger.aggregate([
        { $match: { chefId, type: 'HOLD_RELEASE', createdAt: { $gte: from, $lte: to } } },
        { $group: { _id: null, total: { $sum: { $divide: ['$netAmountCents', 100] } } } },
      ]),
    ])

    return {
      totalCredited: creditResult[0]?.total ?? 0,
      totalDebited: debitResult[0]?.total ?? 0,
      available: availableResult[0]?.total ?? 0,
      pending: pendingResult[0]?.total ?? 0,
      transferred: transferredResult[0]?.total ?? 0,
      held: heldResult[0]?.total ?? 0,
      holdReleased: releasedResult[0]?.total ?? 0,
    }
  })
