import { z } from 'zod'
import { NotFoundError } from '@chefmate/errors'
import { protectedProcedure } from '../trpc'
import { ChefProfile } from '../../models/chef-profile.model'

export const getChefProfileProcedure = protectedProcedure
  .input(z.object({ chefId: z.string() }))
  .query(async ({ ctx, input }) => {
    const { chefId } = input

    // Check cache first (cache-aside)
    const cached = await ctx.cache.getProfile(chefId)
    if (cached) {
      return cached
    }

    // Cache miss — fetch from MongoDB
    const profile = await ChefProfile.findById(chefId)
    if (!profile) {
      throw new NotFoundError('Chef profile not found')
    }

    const doc = profile.toObject()

    // Populate cache
    await ctx.cache.setProfile(chefId, doc as any)

    return doc
  })
