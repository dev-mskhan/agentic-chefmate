import type { PaymentEvent } from '@chefmate/event-contracts'
import { SubscriptionPeriod } from '../models/subscription-period.model'
import { Subscription } from '../models/subscription.model'
import { publishSubscriptionEvent } from '../services/event.service'
import { createLogger } from '@chefmate/logger'

const logger = createLogger('subscription-payment-consumer')

export async function handlePaymentEvent(event: PaymentEvent): Promise<void> {
  switch (event.type) {
    case 'payment.succeeded': {
      // Find the subscription period that generated this order
      const period = await SubscriptionPeriod.findOne({ orderId: event.orderId })
      if (!period) return  // not a subscription order

      if (period.status === 'SUCCEEDED') return  // idempotent

      period.status    = 'SUCCEEDED'
      period.paymentId = event.paymentId
      await period.save()
      logger.info({ subscriptionId: period.subscriptionId, orderId: event.orderId }, 'Subscription period payment confirmed')
      break
    }

    case 'payment.failed': {
      const period = await SubscriptionPeriod.findOne({ orderId: event.orderId })
      if (!period) return

      period.status = 'FAILED'
      await period.save()

      // Mark subscription as PAST_DUE
      const sub = await Subscription.findById(period.subscriptionId)
      if (!sub || sub.status !== 'ACTIVE') return

      sub.status = 'PAST_DUE'
      await sub.save()

      await publishSubscriptionEvent({
        type: 'subscription.past_due', subscriptionId: period.subscriptionId,
        customerId: sub.customerId, planId: sub.planId, chefId: sub.chefId,
        periodStart: period.periodStart, reason: event.reason,
        createdAt: new Date().toISOString(), version: '1',
      })

      logger.warn({ subscriptionId: period.subscriptionId, orderId: event.orderId }, 'Subscription marked PAST_DUE after payment failure')
      break
    }

    default:
      break
  }
}
