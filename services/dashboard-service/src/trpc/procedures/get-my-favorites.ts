import { z } from 'zod'
import { userProcedure } from '../trpc'
import { DashUserProfile } from '../../models/user-profile.model'
import { ChefProfile } from '../../models/chef-profile.model'

export const getMyFavoritesProcedure = userProcedure
  .input(z.object({ enrichChefNames: z.boolean().default(false) }))
  .query(async ({ ctx, input }) => {
    const userId = ctx.principal.userId
    const profile = await DashUserProfile.findOne({ userId }).select('favorites').lean()

    const fav = (profile as any)?.favorites ?? {}
    const chefIds = (fav.chefIds ?? []) as string[]
    const dishIds = (fav.dishIds ?? []) as string[]
    const planIds = (fav.planIds ?? []) as string[]

    let chefProfiles: Array<{ userId: string; displayName: string }> | undefined

    if (input.enrichChefNames && chefIds.length > 0) {
      const chefs = await ChefProfile.find({ userId: { $in: chefIds } })
        .select('userId displayName')
        .lean()
      chefProfiles = (chefs as any[]).map((c) => ({ userId: c.userId, displayName: c.displayName }))
    }

    return {
      chefIds,
      dishIds,
      planIds,
      chefCount: chefIds.length,
      dishCount: dishIds.length,
      planCount: planIds.length,
      ...(chefProfiles !== undefined && { chefProfiles }),
    }
  })
