import { adminProcedure } from '../trpc'
import { AdminPayment }   from '../../models/payment.model'
import { CursorInputSchema, buildCursorFilter, resolveNextCursor } from '../../utils/cursor-pagination'

export const listPaymentsProcedure = adminProcedure
  .input(CursorInputSchema)
  .query(async ({ input }) => {
    const filter   = { ...buildCursorFilter(input.cursor) }
    const payments = await AdminPayment.find(filter)
      .select('_id orderId customerId amountCents currency status refundedAmountCents createdAt')
      .sort({ createdAt: -1 })
      .limit(input.limit)
      .lean()
    return { payments, nextCursor: resolveNextCursor(payments as any[], input.limit) }
  })
