import { z } from 'zod'
import { TRPCError }      from '@trpc/server'
import { adminProcedure } from '../trpc'
import { AdminPayment }   from '../../models/payment.model'

export const getPaymentProcedure = adminProcedure
  .input(z.object({ paymentId: z.string().min(1) }))
  .query(async ({ input }) => {
    // stripeClientSecret is not in the AdminPayment schema — safe to return as-is
    const payment = await AdminPayment.findById(input.paymentId)
      .select('_id orderId customerId amountCents currency status refundedAmountCents stripePaymentIntentId createdAt')
      .lean()
    if (!payment) throw new TRPCError({ code: 'NOT_FOUND', message: 'Payment not found' })
    return payment
  })
