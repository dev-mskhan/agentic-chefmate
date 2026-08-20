import { adminProcedure } from '../trpc'
import { AdminPayment }   from '../../models/payment.model'
import { CursorInputSchema, buildCursorFilter, resolveNextCursor } from '../../utils/cursor-pagination'

export const listDisputesProcedure = adminProcedure
  .input(CursorInputSchema)
  .query(async ({ input }) => {
    const filter = {
      status: { $in: ['REFUNDED', 'PARTIALLY_REFUNDED'] },
      ...buildCursorFilter(input.cursor),
    }
    const disputes = await AdminPayment.find(filter)
      .select('_id orderId customerId amountCents currency status refundedAmountCents createdAt')
      .sort({ createdAt: -1 })
      .limit(input.limit)
      .lean()
    return { disputes, nextCursor: resolveNextCursor(disputes as any[], input.limit) }
  })
