import { z } from 'zod'
import { adminProcedure } from '../trpc'
import { Payout, PayoutStatusValues } from '../../models/payout.model'

export const adminListPayoutsProcedure = adminProcedure
  .input(z.object({
    chefId: z.string().min(1),
    status: z.enum(PayoutStatusValues).optional(),
    cursor: z.string().optional(),
    limit:  z.number().int().min(1).max(100).default(20),
  }))
  .query(async ({ input }) => {
    const filter: Record<string, unknown> = { chefId: input.chefId }
    if (input.status) filter['status'] = input.status
    if (input.cursor) filter['_id']    = { $lt: input.cursor }

    const payouts = await Payout.find(filter).sort({ createdAt: -1 }).limit(input.limit).lean()
    const nextCursor = payouts.length === input.limit
      ? (payouts[payouts.length - 1]!._id as { toString(): string }).toString()
      : undefined

    return { payouts, nextCursor }
  })
