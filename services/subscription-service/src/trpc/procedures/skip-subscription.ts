import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { protectedProcedure } from '../trpc'
import { Subscription } from '../../models/subscription.model'
import { SubscriptionPeriod } from '../../models/subscription-period.model'
import { fetchPlanSnapshot } from '../../services/chef-client.service'
import { publishSubscriptionEvent } from '../../services/event.service'
import { scheduleNextBilling } from '../../utils/scheduler'
import { computeNextPeriod, periodStartKey } from '../../utils/date.utils'
import { NotFoundError, ValidationError } from '@chefmate/errors'

export const skipSubscriptionProcedure = protectedProcedure
  .input(z.object({ subscriptionId: z.string().min(1) }))
  .mutation(async ({ ctx, input }) => {
    const sub = await Subscription.findById(input.subscriptionId)
    if (!sub) throw new NotFoundError('Subscription not found')
    if (sub.customerId !== ctx.principal.userId && ctx.principal.role !== 'ADMIN') {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'You can only skip your own subscriptions' })
    }
    if (sub.status !== 'ACTIVE') throw new ValidationError(`Cannot skip a subscription in ${sub.status} status`)

    const plan = await fetchPlanSnapshot(sub.planId, sub.chefId)
    if (!plan.skipRules.allowSkip) throw new ValidationError('This plan does not allow skipping')

    // Check notice deadline
    if (plan.skipRules.minNoticeHours) {
      const deadlineMs = plan.skipRules.minNoticeHours * 60 * 60 * 1000
      const timeUntilBilling = sub.nextBillingDate.getTime() - Date.now()
      if (timeUntilBilling < deadlineMs) {
        throw new ValidationError(`Skip deadline has passed — must skip at least ${plan.skipRules.minNoticeHours}h before next billing`)
      }
    }

    const skippedPeriodKey = periodStartKey(sub.currentPeriodStart)
    sub.skippedPeriods.push(skippedPeriodKey)

    // Advance to next period
    const nextPeriod = computeNextPeriod(sub.nextBillingDate, sub.frequency)
    sub.nextBillingDate    = nextPeriod.nextBillingDate
    sub.nextOrderDate      = nextPeriod.nextOrderDate
    sub.currentPeriodStart = sub.nextBillingDate
    sub.currentPeriodEnd   = nextPeriod.periodEnd
    await sub.save()

    // Record skipped period
    const idempotencyKey = `sub_${input.subscriptionId}_${skippedPeriodKey}`
    await SubscriptionPeriod.findOneAndUpdate(
      { subscriptionId: input.subscriptionId, periodStart: skippedPeriodKey },
      {
        $set: { status: 'SKIPPED' },
        $setOnInsert: {
          periodEnd: periodStartKey(nextPeriod.periodEnd),
          idempotencyKey,
        },
      },
      { upsert: true, new: true },
    )

    await scheduleNextBilling(input.subscriptionId, nextPeriod.nextBillingDate)

    await publishSubscriptionEvent({
      type: 'subscription.skipped', subscriptionId: input.subscriptionId,
      customerId: sub.customerId, planId: sub.planId, chefId: sub.chefId,
      skippedPeriod: skippedPeriodKey, nextBillingDate: nextPeriod.nextBillingDate.toISOString(),
      createdAt: new Date().toISOString(), version: '1',
    })

    return sub.toObject()
  })
