import { z } from 'zod'
import { adminProcedure }    from '../trpc'
import { AdminChefProfile }  from '../../models/chef-profile.model'
import { CursorInputSchema, buildCursorFilter, resolveNextCursor } from '../../utils/cursor-pagination'

export const listPendingChefsProcedure = adminProcedure
  .input(CursorInputSchema.extend({
    verificationStatus: z.enum(['PENDING', 'ACTIVE', 'SUSPENDED', 'REJECTED']).default('PENDING'),
  }))
  .query(async ({ input }) => {
    const filter = { verificationStatus: input.verificationStatus, ...buildCursorFilter(input.cursor) }
    const chefs  = await AdminChefProfile.find(filter).sort({ createdAt: -1 }).limit(input.limit).lean()
    return { chefs, nextCursor: resolveNextCursor(chefs as any[], input.limit) }
  })
