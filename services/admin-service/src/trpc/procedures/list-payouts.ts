import { z } from 'zod'
import { TRPCError }          from '@trpc/server'
import { adminProcedure }     from '../trpc'
import { callPayoutService }  from '../../services/cross-service'

export const listPayoutsProcedure = adminProcedure
  .input(z.object({
    chefId: z.string().min(1),
    limit:  z.number().int().min(1).max(100).default(20),
    cursor: z.string().optional(),
  }))
  .query(async ({ ctx, input }) => {
    try {
      return await callPayoutService(
        'adminListPayouts',
        { chefId: input.chefId, limit: input.limit, cursor: input.cursor },
        ctx.config.INTERNAL_SECRET!,
        ctx.config.PAYOUT_SERVICE_URL!,
      )
    } catch (err) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: `Failed to fetch payouts: ${(err as Error).message}` })
    }
  })
