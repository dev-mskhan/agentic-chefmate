import { z } from 'zod'
import { publicProcedure } from '../trpc'
import { Review } from '../../models/review.model'

export const listPlanReviewsProcedure = publicProcedure
  .input(
    z.object({
      planId: z.string(),
      page:   z.number().int().positive().default(1),
      limit:  z.number().int().min(1).max(50).default(20),
    }),
  )
  .query(async ({ input }) => {
    const { planId, page, limit } = input
    const filter = { planId, status: 'PUBLISHED' as const }
    const skip   = (page - 1) * limit

    const [reviews, total] = await Promise.all([
      Review.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Review.countDocuments(filter),
    ])

    return {
      reviews,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    }
  })
