import { z } from 'zod'
import { protectedProcedure } from '../trpc'
import { Subscription } from '../../models/subscription.model'
import { NotFoundError, ForbiddenError } from '@chefmate/errors'

export const getSubscriptionProcedure = protectedProcedure
  .input(z.object({ subscriptionId: z.string().min(1) }))
  .query(async ({ ctx, input }) => {
    const sub = await Subscription.findById(input.subscriptionId).lean()
    if (!sub) throw new NotFoundError('Subscription not found')
    if (ctx.principal.role !== 'ADMIN' && sub.customerId !== ctx.principal.userId) {
      throw new ForbiddenError('You can only view your own subscriptions')
    }
    return sub
  })
