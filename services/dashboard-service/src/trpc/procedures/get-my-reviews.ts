import { userProcedure } from '../trpc'
import { Review } from '../../models/review.model'
import { CursorInputSchema, buildCursorFilter, resolveNextCursor } from '../../utils/cursor-pagination'

export const getMyReviewsProcedure = userProcedure
  .input(CursorInputSchema)
  .query(async ({ ctx, input }) => {
    const userId = ctx.principal.userId
    const filter = { customerId: userId, status: 'PUBLISHED', ...buildCursorFilter(input.cursor) }

    const reviews = await Review.find(filter)
      .sort({ createdAt: -1 })
      .limit(input.limit)
      .select('_id chefId dishId planId orderId rating text chefReply createdAt')
      .lean()

    return {
      reviews,
      nextCursor: resolveNextCursor(reviews as any[], input.limit),
    }
  })
