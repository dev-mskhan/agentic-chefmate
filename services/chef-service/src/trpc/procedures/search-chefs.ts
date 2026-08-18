import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { publicProcedure } from '../trpc'
import { ChefProfile } from '../../models/chef-profile.model'
import { CuisineCategoryValues } from '../../constants'
import { normalizeQuery, isEmptyQuery } from '../../search/query-normalizer'
import { createLogger } from '@chefmate/logger'

const logger = createLogger('chef-service:search-chefs')

// ─── Shared relevance score formula ──────────────────────────────────────────
function computeRelevanceScore(
  textScore: number,
  averageRating: number,
  totalReviews: number,
  distanceKm?: number,
): number {
  let score = textScore * 10 + averageRating * 2 + Math.log1p(totalReviews)
  if (distanceKm !== undefined) {
    score -= 0.1 * distanceKm
  }
  return Math.max(0, score)
}

const searchChefsInput = z
  .object({
    query:        z.string().max(500).default(''),
    lat:          z.number().min(-90).max(90).optional(),
    lng:          z.number().min(-180).max(180).optional(),
    radiusKm:     z.number().min(0.1).max(200).optional(),
    cuisine:      z.array(z.enum(CuisineCategoryValues)).optional(),
    minRating:    z.number().min(0).max(5).optional(),
    availableNow: z.boolean().optional(),
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

export const searchChefsProcedure = publicProcedure
  .input(searchChefsInput)
  .query(async ({ input }) => {
    // 1. Normalize query
    const normalizedQuery = normalizeQuery(input.query)
    if (isEmptyQuery(normalizedQuery)) {
      return { results: [], total: 0, page: input.page, totalPages: 0 }
    }

    const hasGeo = input.lat !== undefined && input.lng !== undefined && input.radiusKm !== undefined
    const skip   = (input.page - 1) * input.limit

    try {
      // 2. Build base text filter
      const textFilter: Record<string, unknown> = {
        $text:              { $search: normalizedQuery },
        verificationStatus: 'ACTIVE',
        accountState:       'ACTIVE',
      }
      if (input.cuisine?.length) {
        textFilter['cuisineSpecialties'] = { $in: input.cuisine }
      }
      if (input.minRating !== undefined) {
        textFilter['averageRating'] = { $gte: input.minRating }
      }

      // 3. Optional two-phase geo: resolve nearby chef IDs
      let distanceMap: Map<string, number> | null = null
      if (hasGeo) {
        const nearbyChefs = await ChefProfile.aggregate([
          {
            $geoNear: {
              near:          { type: 'Point' as const, coordinates: [input.lng!, input.lat!] as [number, number] },
              distanceField: '_distMetres',
              maxDistance:   input.radiusKm! * 1000,
              key:           'serviceArea.location',
              spherical:     true,
              query:         { verificationStatus: 'ACTIVE', accountState: 'ACTIVE' },
            },
          },
          { $project: { _id: 1, _distMetres: 1 } },
        ]) as Array<{ _id: unknown; _distMetres: number }>

        if (nearbyChefs.length === 0) {
          return { results: [], total: 0, page: input.page, totalPages: 0 }
        }

        distanceMap = new Map(
          nearbyChefs.map((c) => [(c._id as { toString(): string }).toString(), c._distMetres / 1000])
        )
        textFilter['_id'] = { $in: nearbyChefs.map((c) => c._id) }
      }

      // 4. Execute text search + count in parallel
      const projection = { score: { $meta: 'textScore' } }

      const [docs, total] = await Promise.all([
        ChefProfile.find(textFilter, projection).skip(skip).limit(input.limit).lean(),
        ChefProfile.countDocuments(textFilter),
      ])

      // 5. Compute relevanceScore and shape response
      const results = docs.map((doc) => {
        const textScore     = (doc as typeof doc & { score?: number }).score ?? 0
        const averageRating = (doc.averageRating as number | undefined) ?? 0
        const totalReviews  = (doc.totalReviews  as number | undefined) ?? 0
        const distanceKm    = distanceMap
          ? distanceMap.get((doc._id as { toString(): string }).toString())
          : undefined

        return {
          chefId:             (doc._id as { toString(): string }).toString(),
          displayName:        doc.displayName,
          bio:                doc.bio,
          cuisineSpecialties: doc.cuisineSpecialties,
          averageRating,
          totalReviews,
          serviceArea:        doc.serviceArea,
          verificationStatus: doc.verificationStatus,
          accountState:       doc.accountState,
          relevanceScore:     computeRelevanceScore(textScore, averageRating, totalReviews, distanceKm),
          ...(distanceKm !== undefined && { distanceKm }),
        }
      })

      // 6. Sort by relevanceScore descending
      results.sort((a, b) => b.relevanceScore - a.relevanceScore)

      return {
        results,
        total,
        page:       input.page,
        totalPages: Math.ceil(total / input.limit),
      }
    } catch (err) {
      logger.error({ err }, 'searchChefs: unexpected error')
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred during search' })
    }
  })
