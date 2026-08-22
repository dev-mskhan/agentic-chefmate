import { z } from 'zod'
import { chefProcedure } from '../trpc'
import { Payout } from '../../models/payout.model'
import { resolveChefId } from '../../services/chef-client.service'

export const getPayoutsProcedure = chefProcedure
  .input(z.object({
    cursor: z.string().optional(),
    limit:  z.number().int().min(1).max(100).default(20),
  }))
  .query(async ({ ctx, input }) => {
    const chefId = await resolveChefId(ctx.principal.userId, ctx.principal.email)
    const filter: Record<string, unknown> = { chefId }
    if (input.cursor) filter['_id'] = { $lt: input.cursor }

    const payouts = await Payout.find(filter).sort({ createdAt: -1 }).limit(input.limit).lean()
    const nextCursor = payouts.length === input.limit
      ? (payouts[payouts.length - 1]!._id as { toString(): string }).toString()
      : undefined

    return { payouts, nextCursor }
  })
