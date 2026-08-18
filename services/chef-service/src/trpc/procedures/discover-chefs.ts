import { z } from 'zod'
import { publicProcedure } from '../trpc'
import { ChefProfile } from '../../models/chef-profile.model'
import { CuisineCategoryValues } from '../../constants'

const discoverChefsInput = z.object({
  lat:      z.number().min(-90).max(90),
  lng:      z.number().min(-180).max(180),
  radiusKm: z.number().min(0.1).max(100).default(50),
  cuisine:  z.array(z.enum(CuisineCategoryValues)).optional(),
  page:     z.number().int().positive().default(1),
  limit:    z.number().int().min(1).max(50).default(20),
})

export const discoverChefsProcedure = publicProcedure
  .input(discoverChefsInput)
  .query(async ({ input }) => {
    const maxDistanceMetres = input.radiusKm * 1000

    const matchStage: Record<string, unknown> = {
      verificationStatus: 'ACTIVE',
      accountState:       'ACTIVE',
    }
    if (input.cuisine?.length) {
      matchStage['cuisineSpecialties'] = { $in: input.cuisine }
    }

    const geoNearStage = {
      $geoNear: {
        near:          { type: 'Point' as const, coordinates: [input.lng, input.lat] as [number, number] },
        distanceField: 'distanceMetres',
        maxDistance:   maxDistanceMetres,
        key:           'serviceArea.location',
        spherical:     true,
        query:         matchStage,
      },
    }

    const skip = (input.page - 1) * input.limit

    const [chefs, countResult] = await Promise.all([
      ChefProfile.aggregate([
        geoNearStage,
        { $skip:  skip },
        { $limit: input.limit },
      ]),
      ChefProfile.aggregate([
        geoNearStage,
        { $count: 'total' },
      ]),
    ])

    const total      = (countResult[0] as { total: number } | undefined)?.total ?? 0
    const totalPages = Math.ceil(total / input.limit)

    return {
      chefs,
      total,
      page:       input.page,
      totalPages,
    }
  })
