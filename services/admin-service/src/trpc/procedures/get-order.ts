import { z } from 'zod'
import { TRPCError }      from '@trpc/server'
import { adminProcedure } from '../trpc'
import { AdminOrder }     from '../../models/order.model'
import { AdminPayment }   from '../../models/payment.model'

export const getOrderProcedure = adminProcedure
  .input(z.object({ orderId: z.string().min(1) }))
  .query(async ({ input }) => {
    const [order, payment] = await Promise.all([
      AdminOrder.findById(input.orderId).lean(),
      AdminPayment.findOne({ orderId: input.orderId })
        .select('status amountCents currency refundedAmountCents createdAt')
        .lean(),
    ])
    if (!order) throw new TRPCError({ code: 'NOT_FOUND', message: 'Order not found' })
    return { ...(order as any), payment: payment ?? null }
  })
