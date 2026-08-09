import { NotFoundError } from '@chefmate/errors'
import { chefProcedure } from '../trpc'
import { ChefProfile } from '../../models/chef-profile.model'

export const getMyChefProfileProcedure = chefProcedure
  .query(async ({ ctx }) => {
    const { userId } = ctx.principal

    // Try userId → chefId cache first
    const cachedChefId = await ctx.cache.getUserChefId(userId)
    if (cachedChefId) {
      const cached = await ctx.cache.getProfile(cachedChefId)
      if (cached) {
        return cached
      }
    }

    // Cache miss — fetch from MongoDB by userId
    const profile = await ChefProfile.findOne({ userId })
    if (!profile) {
      throw new NotFoundError('Chef profile not found')
    }

    const chefId = profile._id.toString()
    const doc    = profile.toObject()

    // Populate caches
    await ctx.cache.setUserChefId(userId, chefId)
    await ctx.cache.setProfile(chefId, doc as any)

    return doc
  })
