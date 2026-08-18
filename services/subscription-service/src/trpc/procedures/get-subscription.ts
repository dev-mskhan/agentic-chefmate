import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { protectedProcedure } from '../trpc'
import { Subscription } from '../../models/subscription.model'
import { NotFoundError } from '@chefmate/errors'

export const getSubscriptionProcedure = protectedProcedure
  .input(z.object({ subscriptionId: z.string().min(1) }))
  .query(async ({ ctx, input }) => {
    const sub = await Subscription.findById(input.subscriptionId).lean()
    if (!sub) throw new NotFoundError('Subscription not found')
    if (ctx.principal.role !== 'ADMIN' && sub.customerId !== ctx.principal.userId) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'You can only view your own subscriptions' })
    }
    return sub
  })
