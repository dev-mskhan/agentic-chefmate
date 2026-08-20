import { userProcedure } from '../trpc'
import { Payment } from '../../models/payment.model'
import { CursorInputSchema, buildCursorFilter, resolveNextCursor } from '../../utils/cursor-pagination'

export const getMyPaymentsProcedure = userProcedure
  .input(CursorInputSchema)
  .query(async ({ ctx, input }) => {
    const userId = ctx.principal.userId
    const filter = { customerId: userId, ...buildCursorFilter(input.cursor) }

    // Explicit whitelist — never expose stripePaymentIntentId or stripeClientSecret
    const payments = await Payment.find(filter)
      .sort({ createdAt: -1 })
      .limit(input.limit)
      .select('_id orderId amountCents currency status refundedAmountCents createdAt')
      .lean()

    return {
      payments,
      nextCursor: resolveNextCursor(payments as any[], input.limit),
    }
  })
