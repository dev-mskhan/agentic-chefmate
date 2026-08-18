import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { protectedProcedure } from '../trpc'
import { Payment } from '../../models/payment.model'
import { NotFoundError } from '@chefmate/errors'

export const getPaymentProcedure = protectedProcedure
  .input(z.object({ paymentId: z.string().min(1) }))
  .query(async ({ ctx, input }) => {
    const payment = await Payment.findById(input.paymentId).lean()
    if (!payment) throw new NotFoundError('Payment not found')
    if (ctx.principal.role !== 'ADMIN' && payment.customerId !== ctx.principal.userId) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'You can only view your own payments' })
    }
    return payment
  })

export const getPaymentStatusProcedure = protectedProcedure
  .input(z.object({ orderId: z.string().min(1) }))
  .query(async ({ ctx, input }) => {
    const payment = await Payment.findOne({ orderId: input.orderId }).select('status amountCents currency').lean()
    if (!payment) throw new NotFoundError('Payment not found for this order')
    return { status: payment.status, amountCents: payment.amountCents, currency: payment.currency }
  })
