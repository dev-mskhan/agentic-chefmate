import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { protectedProcedure } from '../trpc'
import { Review } from '../../models/review.model'
import { CompletedOrderEligibility } from '../../models/completed-order-eligibility.model'
import { publishReviewEvent } from '../../services/event.service'

export const createReviewProcedure = protectedProcedure
  .input(
    z.object({
      orderId: z.string(),
      chefId:  z.string(),
      dishId:  z.string().optional(),
      planId:  z.string().optional(),
      rating:  z.number().int().min(1).max(5),
      text:    z.string().max(1000).optional(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const { principal } = ctx

    // 1. Verify eligibility exists
    const eligibility = await CompletedOrderEligibility.findOne({ orderId: input.orderId })
    if (!eligibility) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'No completed order found for this orderId' })
    }

    // 2. Verify caller is the customer on the order
    if (principal.userId !== eligibility.customerId) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'You are not the customer of this order' })
    }

    // 3. Verify dishId is in order items if provided
    if (input.dishId !== undefined) {
      const hasDish = eligibility.items.some((item) => item.dishId === input.dishId)
      if (!hasDish) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'dishId is not part of this order' })
      }
    }

    // 4. Verify planId is in order items if provided
    if (input.planId !== undefined) {
      const hasPlan = eligibility.items.some((item) => item.planId === input.planId)
      if (!hasPlan) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'planId is not part of this order' })
      }
    }

    // 5. Create the review with server-side fields
    let review
    try {
      review = await Review.create({
        customerId:       principal.userId,
        chefId:           input.chefId,
        dishId:           input.dishId,
        planId:           input.planId,
        orderId:          input.orderId,
        rating:           input.rating,
        text:             input.text,
        verifiedPurchase: true,
        status:           'PUBLISHED',
      })
    } catch (err: any) {
      if (err?.code === 11000) {
        throw new TRPCError({ code: 'CONFLICT', message: 'Duplicate review' })
      }
      throw err
    }

    const reviewId    = (review._id as any).toString()
    const createdAt   = review.createdAt.toISOString()

    // 6. Emit review.created event
    await publishReviewEvent({
      type:       'review.created',
      reviewId,
      customerId: principal.userId,
      chefId:     input.chefId,
      orderId:    input.orderId,
      rating:     input.rating,
      createdAt,
      version:    '1',
    })

    // 7. Emit review.published event
    await publishReviewEvent({
      type:       'review.published',
      reviewId,
      customerId: principal.userId,
      chefId:     input.chefId,
      orderId:    input.orderId,
      rating:     input.rating,
      dishId:     input.dishId,
      planId:     input.planId,
      createdAt,
      version:    '1',
    })

    return review
  })
