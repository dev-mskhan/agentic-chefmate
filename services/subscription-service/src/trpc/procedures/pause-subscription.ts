import { z } from 'zod'
import { protectedProcedure } from '../trpc'
import { Subscription } from '../../models/subscription.model'
import { fetchPlanSnapshot } from '../../services/chef-client.service'
import { publishSubscriptionEvent } from '../../services/event.service'
import { cancelBillingJob } from '../../utils/scheduler'
import { NotFoundError, ForbiddenError, ValidationError } from '@chefmate/errors'

export const pauseSubscriptionProcedure = protectedProcedure
  .input(z.object({ subscriptionId: z.string().min(1) }))
  .mutation(async ({ ctx, input }) => {
    const sub = await Subscription.findById(input.subscriptionId)
    if (!sub) throw new NotFoundError('Subscription not found')
    if (sub.customerId !== ctx.principal.userId && ctx.principal.role !== 'ADMIN') {
      throw new ForbiddenError('You can only pause your own subscriptions')
    }
    if (sub.status !== 'ACTIVE') throw new ValidationError(`Cannot pause a subscription in ${sub.status} status`)

    const plan = await fetchPlanSnapshot(sub.planId, sub.chefId)
    if (!plan.pauseRules.allowPause) throw new ValidationError('This plan does not allow pausing')

    sub.status   = 'PAUSED'
    sub.pausedAt = new Date()
    await sub.save()

    await cancelBillingJob(input.subscriptionId)

    await publishSubscriptionEvent({
      type: 'subscription.paused', subscriptionId: input.subscriptionId,
      customerId: sub.customerId, planId: sub.planId, chefId: sub.chefId,
      createdAt: new Date().toISOString(), version: '1',
    })

    return sub.toObject()
  })
