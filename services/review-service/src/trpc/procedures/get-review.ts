import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { publicProcedure } from '../trpc'
import { Review } from '../../models/review.model'

export const getReviewProcedure = publicProcedure
  .input(
    z.object({
      reviewId: z.string(),
    }),
  )
  .query(async ({ input }) => {
    const review = await Review.findById(input.reviewId).lean()

    if (!review || review.status !== 'PUBLISHED') {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Review not found' })
    }

    return review
  })
