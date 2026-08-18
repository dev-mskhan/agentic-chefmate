import { z } from 'zod'
import { protectedProcedure } from '../trpc'
import { Subscription, SubscriptionStatusValues } from '../../models/subscription.model'

export const listMySubscriptionsProcedure = protectedProcedure
  .input(z.object({
    status: z.enum(SubscriptionStatusValues).optional(),
    limit:  z.number().int().min(1).max(100).default(20),
    offset: z.number().int().min(0).default(0),
  }).optional().default({}))
  .query(async ({ ctx, input }) => {
    const filter: Record<string, unknown> = { customerId: ctx.principal.userId }
    if (input.status) filter['status'] = input.status
    const [subscriptions, total] = await Promise.all([
      Subscription.find(filter).sort({ createdAt: -1 }).skip(input.offset).limit(input.limit).lean(),
      Subscription.countDocuments(filter),
    ])
    return { subscriptions, total, limit: input.limit, offset: input.offset }
  })
