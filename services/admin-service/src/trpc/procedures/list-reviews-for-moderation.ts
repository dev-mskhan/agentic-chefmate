import { z } from 'zod'
import { adminProcedure } from '../trpc'
import { AdminReview }    from '../../models/review.model'
import { CursorInputSchema, buildCursorFilter, resolveNextCursor } from '../../utils/cursor-pagination'

export const listReviewsForModerationProcedure = adminProcedure
  .input(CursorInputSchema.extend({
    status: z.enum(['PENDING', 'HIDDEN', 'PUBLISHED', 'REJECTED']).default('PENDING'),
  }))
  .query(async ({ input }) => {
    const filter  = { status: input.status, ...buildCursorFilter(input.cursor) }
    const reviews = await AdminReview.find(filter).sort({ createdAt: -1 }).limit(input.limit).lean()
    return { reviews, nextCursor: resolveNextCursor(reviews as any[], input.limit) }
  })
