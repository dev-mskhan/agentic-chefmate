import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { chefProcedure } from '../trpc'
import { Review } from '../../models/review.model'
import { publishReviewEvent } from '../../services/event.service'
import { resolveChefId } from '../../services/chef-client.service'
import mongoose from 'mongoose'

export const replyToReviewProcedure = chefProcedure
  .input(
    z.object({
      reviewId: z.string(),
      text:     z.string().min(1).max(1000),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const { principal } = ctx

    // 1. Lookup review
    if (!mongoose.isValidObjectId(input.reviewId)) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Review not found' })
    }
    const review = await Review.findById(input.reviewId)
    if (!review) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Review not found' })
    }

    // 2. Verify caller is the chef of this review (either auth userId or chef profile ID)
    let callerChefId: string | null = null
    try {
      callerChefId = await resolveChefId(principal.userId, principal.email)
    } catch {
      // If profile resolution fails, fall back to userId comparison
    }

    const isMatch = principal.userId === review.chefId || (callerChefId && callerChefId === review.chefId)
    if (!isMatch) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'You are not the chef of this review' })
    }

    // 3. Verify no reply already exists
    if (review.chefReply) {
      throw new TRPCError({ code: 'CONFLICT', message: 'A reply already exists for this review' })
    }

    // 4. Set the reply and save
    review.chefReply = { text: input.text, createdAt: new Date() }
    await review.save()

    // 5. Emit review.replied event
    await publishReviewEvent({
      type:       'review.replied',
      reviewId:   (review._id as any).toString(),
      customerId: review.customerId,
      chefId:     review.chefId,
      orderId:    review.orderId,
      rating:     review.rating,
      createdAt:  review.createdAt.toISOString(),
      version:    '1',
    })

    return {
      ...review.toObject(),
      _id: (review._id as any).toString(),
    }
  })
