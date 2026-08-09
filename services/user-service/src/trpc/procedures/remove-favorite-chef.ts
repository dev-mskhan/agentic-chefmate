import { z } from 'zod'
import { NotFoundError } from '@chefmate/errors'
import { protectedProcedure } from '../trpc'
import { UserProfile } from '../../models/user-profile.model'

export const removeFavoriteChefProcedure = protectedProcedure
  .input(z.object({ chefId: z.string().min(1) }))
  .mutation(async ({ ctx, input }) => {
    const { userId } = ctx.principal

    // Verify the chef is in the list first
    const existing = await UserProfile.findOne({
      userId,
      'favorites.chefIds': input.chefId,
    })

    if (!existing) {
      // Check if profile exists at all
      const profile = await UserProfile.findOne({ userId })
      if (!profile) {
        throw new NotFoundError('User profile not found')
      }
      throw new NotFoundError('Chef not in favorites')
    }

    const profile = await UserProfile.findOneAndUpdate(
      { userId },
      { $pull: { 'favorites.chefIds': input.chefId } },
      { new: true },
    )

    if (!profile) {
      throw new NotFoundError('User profile not found')
    }

    await ctx.cache.invalidateFavorites(userId)

    return { chefIds: profile.favorites.chefIds, dishIds: profile.favorites.dishIds }
  })
