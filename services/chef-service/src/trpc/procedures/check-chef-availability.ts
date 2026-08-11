import { z } from 'zod'
import { protectedProcedure } from '../trpc'
import { canChefAcceptOrder } from '../../domain/availability'

export const checkChefAvailabilityProcedure = protectedProcedure
  .input(z.object({
    chefId: z.string(),
    date:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  }))
  .query(async ({ ctx, input }) => {
    const result = await canChefAcceptOrder(input.chefId, input.date, ctx.redis)
    return { chefId: input.chefId, date: input.date, ...result }
  })
