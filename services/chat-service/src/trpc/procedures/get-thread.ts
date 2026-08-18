import { z } from 'zod'
import { protectedProcedure } from '../trpc'
import { getOrCreateThread } from '../../services/thread.service'

export const getThreadProcedure = protectedProcedure
  .input(z.object({ orderId: z.string() }))
  .query(async ({ input, ctx }) => {
    const thread = await getOrCreateThread(input.orderId, ctx.principal)
    return thread.toObject()
  })
