import { z } from 'zod'
import { chefProcedure } from '../trpc'
import { Payout } from '../../models/payout.model'

export const getPayoutHistoryProcedure = chefProcedure
  .input(
    z.object({
      limit: z.number().int().min(1).max(100).default(20),
      cursor: z.string().optional(),
    }),
  )
  .query(async ({ input, ctx }) => {
    const chefId = ctx.principal.userId
    const { limit, cursor } = input

    const filter: Record<string, unknown> = { chefId }
    if (cursor) filter['_id'] = { $lt: cursor }

    const payouts = await Payout.find(filter).sort({ createdAt: -1 }).limit(limit).lean()
    const nextCursor = payouts.length === limit ? (payouts.at(-1) as any)._id.toString() : undefined

    return { payouts, nextCursor }
  })
