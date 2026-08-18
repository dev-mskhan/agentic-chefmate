import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { publicProcedure } from '../trpc'
import { MealPlan } from '../../models/meal-plan.model'
import { normalizeQuery, isEmptyQuery } from '../../search/query-normalizer'
import { createLogger } from '@chefmate/logger'

const logger = createLogger('chef-service:search-meal-plans')

function computeRelevanceScore(textScore: number, averageRating: number, totalReviews: number): number {
  return Math.max(0, textScore * 10 + averageRating * 2 + Math.log1p(totalReviews))
}

const searchMealPlansInput = z.object({
  query:     z.string().max(500).default(''),
  chefId:    z.string().optional(),
  minRating: z.number().min(0).max(5).optional(),
  page:      z.number().int().min(1).default(1),
  limit:     z.number().int().min(1).max(50).default(20),
})

export const searchMealPlansProcedure = publicProcedure
  .input(searchMealPlansInput)
  .query(async ({ input }) => {
    const normalizedQuery = normalizeQuery(input.query)
    if (isEmptyQuery(normalizedQuery)) {
      return { results: [], total: 0, page: input.page, totalPages: 0 }
    }

    const skip = (input.page - 1) * input.limit

    try {
      const filter: Record<string, unknown> = {
        $text:  { $search: normalizedQuery },
        status: 'ACTIVE',
      }
      if (input.chefId) {
        filter['chefId'] = input.chefId
      }
      if (input.minRating !== undefined) {
        filter['averageRating'] = { $gte: input.minRating }
      }

      const projection = { score: { $meta: 'textScore' } }

      const [docs, total] = await Promise.all([
        MealPlan.find(filter, projection).skip(skip).limit(input.limit).lean(),
        MealPlan.countDocuments(filter),
      ])

      const results = docs.map((doc) => {
        const textScore     = (doc as typeof doc & { score?: number }).score ?? 0
        const averageRating = (doc.averageRating as number | undefined) ?? 0
        const totalReviews  = (doc.totalReviews  as number | undefined) ?? 0

        return {
          planId:        (doc._id as { toString(): string }).toString(),
          chefId:        doc.chefId,
          name:          doc.name,
          description:   doc.description,
          type:          doc.type,
          frequency:     doc.frequency,
          status:        doc.status,
          basePrice:     doc.basePrice,
          currency:      doc.currency,
          tiers:         doc.tiers,
          averageRating,
          totalReviews,
          relevanceScore: computeRelevanceScore(textScore, averageRating, totalReviews),
        }
      })

      results.sort((a, b) => b.relevanceScore - a.relevanceScore)

      return {
        results,
        total,
        page:       input.page,
        totalPages: Math.ceil(total / input.limit),
      }
    } catch (err) {
      logger.error({ err }, 'searchMealPlans: unexpected error')
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred during search' })
    }
  })
