import { z } from 'zod'
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

const discoverDishesInput = z
  .object({
    lat:          z.number().min(-90).max(90),
    lng:          z.number().min(-180).max(180),
    radiusKm:     z.number().min(0.1).max(100).default(50),
    cuisine:      z.array(z.enum(CuisineCategoryValues)).optional(),
    dietaryTags:  z.array(z.enum(DietaryTagValues)).optional(),
    allergens:    z.array(z.enum(AllergenValues)).optional(),
    minPrice:     z.number().min(0).optional(),
    maxPrice:     z.number().positive().optional(),
    category:     z.string().max(60).optional(),
    occasionTags: z.array(z.enum(OccasionTagValues)).optional(),
    chefId:       z.string().optional(),
    availableDay: z.enum(WEEK_DAYS).optional(),
    page:         z.number().int().positive().default(1),
    limit:        z.number().int().min(1).max(50).default(20),
  })
  .refine(
    (d) => d.minPrice === undefined || d.maxPrice === undefined || d.minPrice <= d.maxPrice,
    { message: 'minPrice must not exceed maxPrice' },
  )

export const discoverDishesProcedure = publicProcedure
  .input(discoverDishesInput)
  .query(async ({ input }) => {
    // Step 1: resolve Active Chef IDs within radius via $geoNear on chefprofiles
    const nearbyChefs = await ChefProfile.aggregate([
      {
        $geoNear: {
          near:          { type: 'Point' as const, coordinates: [input.lng, input.lat] as [number, number] },
          distanceField: '_dist',
          maxDistance:   input.radiusKm * 1000,
          key:           'serviceArea.location',
          spherical:     true,
          query:         { verificationStatus: 'ACTIVE', accountState: 'ACTIVE' },
        },
      },
      { $project: { _id: 1 } },
    ])

    // Short-circuit: no active chefs nearby — skip dish query entirely
    if (nearbyChefs.length === 0) {
      return { dishes: [], total: 0, page: input.page, totalPages: 0 }
    }

    const activeChefIds = nearbyChefs.map((c: { _id: unknown }) => c._id)

    // Step 2: build dish filter
    const dishFilter: Record<string, unknown> = {
      status: 'ACTIVE',
      chefId: { $in: activeChefIds },
    }

    if (input.cuisine?.length)      dishFilter['cuisine']      = { $in: input.cuisine }
    if (input.dietaryTags?.length)  dishFilter['dietaryTags']  = { $all: input.dietaryTags }
    if (input.allergens?.length)    dishFilter['allergens']    = { $nin: input.allergens }
    if (input.category)             dishFilter['category']     = input.category
    if (input.occasionTags?.length) dishFilter['occasionTags'] = { $in: input.occasionTags }
    if (input.chefId)               dishFilter['chefId']       = input.chefId

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

    const skip = (input.page - 1) * input.limit

    const [dishes, total] = await Promise.all([
      Dish.find(dishFilter).skip(skip).limit(input.limit).lean(),
      Dish.countDocuments(dishFilter),
    ])

    const totalPages = Math.ceil(total / input.limit)

    return {
      dishes,
      total,
      page: input.page,
      totalPages,
    }
  })
