import { z } from 'zod'
import { TRPCError }        from '@trpc/server'
import { adminProcedure }   from '../trpc'
import { AdminPayment }     from '../../models/payment.model'
import { createAuditEntry } from '../../services/audit.service'
import { createLogger }     from '@chefmate/logger'

const logger = createLogger('admin-service:request-refund')

export const requestRefundProcedure = adminProcedure
  .input(z.object({
    paymentId:   z.string().min(1),
    reason:      z.string().min(1),
    amountCents: z.number().int().positive().optional(),
  }))
  .mutation(async ({ ctx, input }) => {
    const payment = await AdminPayment.findById(input.paymentId).lean()
    if (!payment) throw new TRPCError({ code: 'NOT_FOUND', message: 'Payment not found' })

    const paymentIntentId = (payment as any).stripePaymentIntentId as string | undefined
    if (!paymentIntentId) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Payment has no Stripe PaymentIntent — cannot refund' })
    }

    // Call payment-service internal refund route
    try {
      const res = await fetch(`${ctx.config.PAYMENT_SERVICE_URL}/internal/refund`, {
        method:  'POST',
        headers: {
          'Content-Type':      'application/json',
          'x-internal-secret': ctx.config.INTERNAL_SECRET,
        },
        body: JSON.stringify({ paymentIntentId, amountCents: input.amountCents }),
      })
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        logger.error({ status: res.status, body: text }, 'Refund call to payment-service failed')
        throw new Error(`Payment service returned ${res.status}: ${text}`)
      }
    } catch (err) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: `Refund failed: ${(err as Error).message}` })
    }

    await createAuditEntry({
      adminUserId: ctx.principal.userId,
      action:      'REFUND_REQUESTED',
      targetType:  'payment',
      targetId:    input.paymentId,
      reason:      input.reason,
      metadata:    { paymentIntentId, amountCents: input.amountCents },
    })
    return { success: true }
  })
