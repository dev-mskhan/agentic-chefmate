import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { publicProcedure } from '../trpc'
import { ChefProfile } from '../../models/chef-profile.model'
import { Dish } from '../../models/dish.model'
import { WEEK_DAYS } from '../../models/dish.model'
import {
  CuisineCategoryValues,
  DietaryTagValues,
  AllergenValues,
  OccasionTagValues,
} from '../../constants'
import { normalizeQuery, isEmptyQuery } from '../../search/query-normalizer'
import { createLogger } from '@chefmate/logger'

const logger = createLogger('chef-service:search-dishes')

function computeRelevanceScore(textScore: number, averageRating: number, totalReviews: number): number {
  return Math.max(0, textScore * 10 + averageRating * 2 + Math.log1p(totalReviews))
}

const searchDishesInput = z
  .object({
    query:        z.string().max(500).default(''),
    lat:          z.number().min(-90).max(90).optional(),
    lng:          z.number().min(-180).max(180).optional(),
    radiusKm:     z.number().min(0.1).max(200).optional(),
    cuisine:      z.array(z.enum(CuisineCategoryValues)).optional(),
    dietaryTags:  z.array(z.enum(DietaryTagValues)).optional(),
    allergens:    z.array(z.enum(AllergenValues)).optional(),
    minPrice:     z.number().min(0).optional(),
    maxPrice:     z.number().positive().optional(),
    category:     z.string().max(60).optional(),
    occasionTags: z.array(z.enum(OccasionTagValues)).optional(),
    chefId:       z.string().optional(),
    availableDay: z.enum(WEEK_DAYS).optional(),
    minRating:    z.number().min(0).max(5).optional(),
    page:         z.number().int().min(1).default(1),
    limit:        z.number().int().min(1).max(50).default(20),
  })
  .refine(
    (d) => {
      const geoCount = [d.lat, d.lng, d.radiusKm].filter((v) => v !== undefined).length
      return geoCount === 0 || geoCount === 3
    },
    { message: 'lat, lng, and radiusKm must all be provided together or not at all' },
  )
  .refine(
    (d) => d.minPrice === undefined || d.maxPrice === undefined || d.minPrice <= d.maxPrice,
    { message: 'minPrice must not exceed maxPrice' },
  )

export const searchDishesProcedure = publicProcedure
  .input(searchDishesInput)
  .query(async ({ input }) => {
    const normalizedQuery = normalizeQuery(input.query)
    if (isEmptyQuery(normalizedQuery)) {
      return { results: [], total: 0, page: input.page, totalPages: 0 }
    }

    const hasGeo = input.lat !== undefined && input.lng !== undefined && input.radiusKm !== undefined
    const skip   = (input.page - 1) * input.limit

    try {
      // Build dish filter — mirrors discoverDishes pattern exactly
      const dishFilter: Record<string, unknown> = {
        $text:  { $search: normalizedQuery },
        status: 'ACTIVE',
      }

      // Optional two-phase geo
      if (hasGeo) {
        const nearbyChefs = await ChefProfile.aggregate([
          {
            $geoNear: {
              near:          { type: 'Point' as const, coordinates: [input.lng!, input.lat!] as [number, number] },
              distanceField: '_dist',
              maxDistance:   input.radiusKm! * 1000,
              key:           'serviceArea.location',
              spherical:     true,
              query:         { verificationStatus: 'ACTIVE', accountState: 'ACTIVE' },
            },
          },
          { $project: { _id: 1 } },
        ])

        if (nearbyChefs.length === 0) {
          return { results: [], total: 0, page: input.page, totalPages: 0 }
        }

        dishFilter['chefId'] = { $in: nearbyChefs.map((c: { _id: unknown }) => c._id) }
      }

      // Structured filters — same logic as discoverDishes
      if (input.cuisine?.length)      dishFilter['cuisine']      = { $in: input.cuisine }
      if (input.dietaryTags?.length)  dishFilter['dietaryTags']  = { $all: input.dietaryTags }
      if (input.allergens?.length)    dishFilter['allergens']    = { $nin: input.allergens }
      if (input.category)             dishFilter['category']     = { $regex: new RegExp(`^${input.category}$`, 'i') }
      if (input.occasionTags?.length) dishFilter['occasionTags'] = { $in: input.occasionTags }
      if (input.chefId) {
        // If geo already set chefId as $in, override with exact chefId match (more restrictive)
        dishFilter['chefId'] = input.chefId
      }
      if (input.minPrice !== undefined) {
        dishFilter['price'] = { ...(dishFilter['price'] as object ?? {}), $gte: input.minPrice }
      }
      if (input.maxPrice !== undefined) {
        dishFilter['price'] = { ...(dishFilter['price'] as object ?? {}), $lte: input.maxPrice }
      }
      if (input.availableDay) {
        dishFilter['availability.isAvailable']   = true
        dishFilter['availability.availableDays'] = input.availableDay
      }
      if (input.minRating !== undefined) {
        dishFilter['averageRating'] = { $gte: input.minRating }
      }

      const projection = { score: { $meta: 'textScore' } }

      const [docs, total] = await Promise.all([
        Dish.find(dishFilter, projection).skip(skip).limit(input.limit).lean(),
        Dish.countDocuments(dishFilter),
      ])

      const results = docs.map((doc) => {
        const textScore     = (doc as typeof doc & { score?: number }).score ?? 0
        const averageRating = (doc.averageRating as number | undefined) ?? 0
        const totalReviews  = (doc.totalReviews  as number | undefined) ?? 0

        return {
          dishId:        (doc._id as { toString(): string }).toString(),
          chefId:        doc.chefId,
          name:          doc.name,
          description:   doc.description,
          cuisine:       doc.cuisine,
          category:      doc.category,
          price:         doc.price,
          currency:      doc.currency,
          dietaryTags:   doc.dietaryTags,
          allergens:     doc.allergens,
          occasionTags:  doc.occasionTags,
          averageRating,
          totalReviews,
          status:        doc.status,
          availability:  doc.availability,
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
      logger.error({ err }, 'searchDishes: unexpected error')
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred during search' })
    }
  })
