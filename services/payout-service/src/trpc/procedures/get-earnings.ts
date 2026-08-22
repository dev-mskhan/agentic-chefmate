import { z } from 'zod'
import { chefProcedure } from '../trpc'
import { EarningsLedger, LedgerEntryTypeValues } from '../../models/earnings-ledger.model'
import { resolveChefId } from '../../services/chef-client.service'

export const getEarningsProcedure = chefProcedure
  .input(z.object({
    cursor: z.string().optional(),
    limit:  z.number().int().min(1).max(100).default(20),
    type:   z.enum(LedgerEntryTypeValues).optional(),
  }))
  .query(async ({ ctx, input }) => {
    const chefId = await resolveChefId(ctx.principal.userId, ctx.principal.email)
    const filter: Record<string, unknown> = { chefId }
    if (input.type)   filter['type']      = input.type
    if (input.cursor) filter['_id']       = { $lt: input.cursor }

    const entries = await EarningsLedger.find(filter)
      .sort({ createdAt: -1 })
      .limit(input.limit)
      .lean()

    const nextCursor = entries.length === input.limit
      ? (entries[entries.length - 1]!._id as { toString(): string }).toString()
      : undefined

    return { entries, nextCursor }
  })
