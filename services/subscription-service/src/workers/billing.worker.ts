import { Worker } from 'bullmq'
import type { BillingJobData } from '../queues/subscription.queue'
import { getBullMQConnection } from '../queues/redis-connection'
import { Subscription } from '../models/subscription.model'
import { SubscriptionPeriod } from '../models/subscription-period.model'
import { createRecurringOrder } from '../services/order-client.service'
import { publishSubscriptionEvent } from '../services/event.service'
import { scheduleNextBilling } from '../utils/scheduler'
import { computeNextPeriod, periodStartKey } from '../utils/date.utils'
import { createLogger } from '@chefmate/logger'

const logger = createLogger('subscription-billing-worker')

export function startBillingWorker(): Worker<BillingJobData> {
  return new Worker<BillingJobData>(
    'subscription-billing',
    async (job) => {
      const { subscriptionId, periodStart } = job.data
      logger.info({ subscriptionId, periodStart }, 'Billing job started')

      // 1. Load subscription
      const sub = await Subscription.findById(subscriptionId)
      if (!sub) { logger.warn({ subscriptionId }, 'Subscription not found — skipping'); return }
      if (sub.status !== 'ACTIVE') { logger.info({ subscriptionId, status: sub.status }, 'Subscription not active — skipping'); return }

      // 2. Check if this period is in skippedPeriods
      if (sub.skippedPeriods.includes(periodStart)) {
        logger.info({ subscriptionId, periodStart }, 'Period is skipped — advancing to next')
        const nextPeriod = computeNextPeriod(sub.nextBillingDate, sub.frequency)
        sub.nextBillingDate    = nextPeriod.nextBillingDate
        sub.nextOrderDate      = nextPeriod.nextOrderDate
        sub.currentPeriodStart = sub.nextBillingDate
        sub.currentPeriodEnd   = nextPeriod.periodEnd
        await sub.save()
        await scheduleNextBilling(subscriptionId, nextPeriod.nextBillingDate)
        return
      }

      const idempotencyKey = `sub_${subscriptionId}_${periodStart}`

      // 3. Check if already processed (idempotency)
      const existing = await SubscriptionPeriod.findOne({ idempotencyKey })
      if (existing && existing.status === 'SUCCEEDED') {
        logger.info({ subscriptionId, periodStart }, 'Period already succeeded — skipping duplicate')
        return
      }

      // 4. Create/update period record (PENDING)
      const periodEnd = periodStartKey(sub.currentPeriodEnd)
      await SubscriptionPeriod.findOneAndUpdate(
        { idempotencyKey },
        { $setOnInsert: { subscriptionId, periodStart, periodEnd, status: 'PENDING', idempotencyKey } },
        { upsert: true },
      )

      // 5. Create recurring order via Order Service
      const orderResult = await createRecurringOrder({
        subscriptionId,
        customerId:    sub.customerId,
        customerEmail: `${sub.customerId}@placeholder.internal`,  // email resolved by auth headers in internal call
        chefId:        sub.chefId,
        deliveryDate:  periodStart,
        items:         sub.selectedDishIds.map((dishId) => ({ dishId, quantity: 1 })),
        addressSnapshot: sub.deliveryAddress,
        currency:      sub.priceSnapshot.currency,
        idempotencyKey,
      })

      // 6. Update period record → SUCCEEDED
      await SubscriptionPeriod.findOneAndUpdate(
        { idempotencyKey },
        { $set: { status: 'SUCCEEDED', orderId: orderResult.orderId, paymentId: orderResult.paymentId ?? undefined } },
      )

      // 7. Advance subscription period
      const nextPeriod = computeNextPeriod(sub.nextBillingDate, sub.frequency)
      sub.nextBillingDate    = nextPeriod.nextBillingDate
      sub.nextOrderDate      = nextPeriod.nextOrderDate
      sub.currentPeriodStart = sub.nextBillingDate
      sub.currentPeriodEnd   = nextPeriod.periodEnd
      await sub.save()

      // 8. Schedule next billing
      await scheduleNextBilling(subscriptionId, nextPeriod.nextBillingDate)

      // 9. Publish event
      await publishSubscriptionEvent({
        type: 'subscription.order_generated', subscriptionId,
        customerId: sub.customerId, planId: sub.planId, chefId: sub.chefId,
        orderId: orderResult.orderId, periodStart,
        createdAt: new Date().toISOString(), version: '1',
      })

      logger.info({ subscriptionId, orderId: orderResult.orderId, periodStart }, 'Billing cycle completed')
    },
    {
      connection:  getBullMQConnection(),
      concurrency: 10,
    },
  )
}
