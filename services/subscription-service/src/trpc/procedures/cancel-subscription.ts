import { z } from 'zod'
import { protectedProcedure } from '../trpc'
import { Subscription } from '../../models/subscription.model'
import { publishSubscriptionEvent } from '../../services/event.service'
import { cancelBillingJob } from '../../utils/scheduler'
import { NotFoundError, ForbiddenError, ValidationError } from '@chefmate/errors'

export const cancelSubscriptionProcedure = protectedProcedure
  .input(z.object({
    subscriptionId:     z.string().min(1),
    cancellationReason: z.string().max(500).optional(),
  }))
  .mutation(async ({ ctx, input }) => {
    const sub = await Subscription.findById(input.subscriptionId)
    if (!sub) throw new NotFoundError('Subscription not found')
    if (sub.customerId !== ctx.principal.userId && ctx.principal.role !== 'ADMIN') {
      throw new ForbiddenError('You can only cancel your own subscriptions')
    }
    if (sub.status === 'CANCELLED') throw new ValidationError('Subscription is already cancelled')

    sub.status             = 'CANCELLED'
    sub.cancelledAt        = new Date()
    sub.cancellationReason = input.cancellationReason
    await sub.save()

    await cancelBillingJob(input.subscriptionId)

    await publishSubscriptionEvent({
      type: 'subscription.cancelled', subscriptionId: input.subscriptionId,
      customerId: sub.customerId, planId: sub.planId, chefId: sub.chefId,
      cancellationReason: input.cancellationReason,
      createdAt: new Date().toISOString(), version: '1',
    })

    return sub.toObject()
  })
