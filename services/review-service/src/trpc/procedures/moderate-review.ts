import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { adminProcedure } from '../trpc'
import { Review } from '../../models/review.model'
import { publishReviewEvent } from '../../services/event.service'
import type { ReviewStatus } from '../../models/review.model'

import mongoose from 'mongoose'

export const moderateReviewProcedure = adminProcedure
  .input(
    z.object({
      reviewId: z.string(),
      status:   z.enum(['HIDDEN', 'REJECTED', 'PUBLISHED']),
    }),
  )
  .mutation(async ({ input }) => {
    // 1. Lookup review
    if (!mongoose.isValidObjectId(input.reviewId)) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Review not found' })
    }
    const review = await Review.findById(input.reviewId)
    if (!review) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Review not found' })
    }

    // 2. Capture old status and update
    const oldStatus = review.status as ReviewStatus
    review.status    = input.status as ReviewStatus
    review.updatedAt = new Date()
    await review.save()

    // 3. Emit review.status_changed event
    await publishReviewEvent({
      type:       'review.status_changed',
      reviewId:   (review._id as any).toString(),
      customerId: review.customerId,
      chefId:     review.chefId,
      orderId:    review.orderId,
      rating:     review.rating,
      dishId:     review.dishId,
      planId:     review.planId,
      oldStatus,
      newStatus:  input.status as ReviewStatus,
      createdAt:  review.createdAt.toISOString(),
      version:    '1',
    })

    return {
      ...review.toObject(),
      _id: (review._id as any).toString(),
    }
  })
