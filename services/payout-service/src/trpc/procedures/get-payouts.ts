import { z } from 'zod'
import { chefProcedure } from '../trpc'
import { Payout } from '../../models/payout.model'

export const getPayoutsProcedure = chefProcedure
  .input(z.object({
    cursor: z.string().optional(),
    limit:  z.number().int().min(1).max(100).default(20),
  }))
  .query(async ({ ctx, input }) => {
    const filter: Record<string, unknown> = { chefId: ctx.principal.userId }
    if (input.cursor) filter['_id'] = { $lt: input.cursor }

    const payouts = await Payout.find(filter).sort({ createdAt: -1 }).limit(input.limit).lean()
    const nextCursor = payouts.length === input.limit
      ? (payouts[payouts.length - 1]!._id as { toString(): string }).toString()
      : undefined

    return { payouts, nextCursor }
  })
