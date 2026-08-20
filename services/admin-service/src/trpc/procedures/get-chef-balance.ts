import { z } from 'zod'
import { TRPCError }          from '@trpc/server'
import { adminProcedure }     from '../trpc'
import { callPayoutService }  from '../../services/cross-service'

export const getChefBalanceProcedure = adminProcedure
  .input(z.object({ chefId: z.string().min(1) }))
  .query(async ({ ctx, input }) => {
    try {
      return await callPayoutService(
        'adminGetChefBalance',
        { chefId: input.chefId },
        ctx.config.INTERNAL_SECRET,
        ctx.config.PAYOUT_SERVICE_URL,
      )
    } catch (err) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: `Failed to fetch balance: ${(err as Error).message}` })
    }
  })
