import { z } from 'zod'
import { adminProcedure } from '../trpc'
import { Payment } from '../../models/payment.model'
import { NotFoundError, ValidationError } from '@chefmate/errors'
import { createRefund } from '../../services/stripe.service'
import { publishPaymentEvent } from '../../services/event.service'
import { createLogger } from '@chefmate/logger'

const logger = createLogger('create-refund')

export const createRefundProcedure = adminProcedure
  .input(z.object({ orderId: z.string().min(1), reason: z.string().optional() }))
  .mutation(async ({ input }) => {
    const payment = await Payment.findOne({ orderId: input.orderId })
    if (!payment) throw new NotFoundError('Payment not found for this order')
    if (payment.status !== 'SUCCEEDED') {
      throw new ValidationError(`Cannot refund payment in ${payment.status} status`)
    }
    if (!payment.stripePaymentIntentId) {
      throw new ValidationError('Payment has no Stripe PaymentIntent ID')
    }

    const refund = await createRefund(payment.stripePaymentIntentId)
    payment.status = 'REFUNDED'
    payment.refundedAmountCents = payment.amountCents
    await payment.save()

    logger.info({ orderId: input.orderId, refundId: refund.id }, 'Refund created')

    await publishPaymentEvent({
      type:           'payment.refunded',
      paymentId:      payment._id.toString(),
      orderId:        payment.orderId,
      customerId:     payment.customerId,
      amount:         payment.amountCents,
      currency:       payment.currency,
      stripeRefundId: refund.id,
      createdAt:      new Date().toISOString(),
      version:        '1',
    })

    return { paymentId: payment._id.toString(), status: 'REFUNDED', refundId: refund.id }
  })
