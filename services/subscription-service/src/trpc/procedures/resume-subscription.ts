import { z } from 'zod'
import { protectedProcedure } from '../trpc'
import { Subscription } from '../../models/subscription.model'
import { publishSubscriptionEvent } from '../../services/event.service'
import { scheduleNextBilling } from '../../utils/scheduler'
import { computeNextPeriod } from '../../utils/date.utils'
import { NotFoundError, ForbiddenError, ValidationError } from '@chefmate/errors'

export const resumeSubscriptionProcedure = protectedProcedure
  .input(z.object({ subscriptionId: z.string().min(1) }))
  .mutation(async ({ ctx, input }) => {
    const sub = await Subscription.findById(input.subscriptionId)
    if (!sub) throw new NotFoundError('Subscription not found')
    if (sub.customerId !== ctx.principal.userId && ctx.principal.role !== 'ADMIN') {
      throw new ForbiddenError('You can only resume your own subscriptions')
    }
    if (sub.status !== 'PAUSED') throw new ValidationError(`Cannot resume a subscription in ${sub.status} status`)

    const now    = new Date()
    const period = computeNextPeriod(now, sub.frequency)

    sub.status          = 'ACTIVE'
    sub.pausedAt        = undefined
    sub.nextBillingDate = period.nextBillingDate
    sub.nextOrderDate   = period.nextOrderDate
    sub.currentPeriodStart = now
    sub.currentPeriodEnd   = period.periodEnd
    await sub.save()

    await scheduleNextBilling(input.subscriptionId, period.nextBillingDate)

    await publishSubscriptionEvent({
      type: 'subscription.resumed', subscriptionId: input.subscriptionId,
      customerId: sub.customerId, planId: sub.planId, chefId: sub.chefId,
      nextBillingDate: period.nextBillingDate.toISOString(),
      createdAt: new Date().toISOString(), version: '1',
    })

    return sub.toObject()
  })
