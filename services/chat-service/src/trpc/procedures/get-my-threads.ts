import { z } from 'zod'
import { protectedProcedure } from '../trpc'
import { ChatThread } from '../../models/thread.model'
import { resolveChefId } from '../../services/thread.service'

export const getMyThreadsProcedure = protectedProcedure
  .input(z.object({
    page:  z.number().int().positive().default(1),
    limit: z.number().int().positive().max(50).default(20),
  }))
  .query(async ({ input, ctx }) => {
    const effectiveLimit = Math.min(input.limit, 50)
    const skip = (input.page - 1) * effectiveLimit

    let filter: Record<string, unknown> = {}
    if (ctx.principal.role === 'USER') {
      filter = { customerId: ctx.principal.userId }
    } else {
      const chefProfileId = await resolveChefId(ctx.principal.userId)
      filter = { $or: [{ chefId: chefProfileId }, { chefId: ctx.principal.userId }] }
    }

    const [threads, total] = await Promise.all([
      ChatThread.find(filter)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(effectiveLimit)
        .lean(),
      ChatThread.countDocuments(filter),
    ])

    return { threads, total, page: input.page, totalPages: Math.ceil(total / effectiveLimit) }
  })
