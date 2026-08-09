import { z } from 'zod'
import { NotFoundError } from '@chefmate/errors'
import { protectedProcedure } from '../trpc'
import { UserProfile } from '../../models/user-profile.model'

export const removeFavoriteDishProcedure = protectedProcedure
  .input(z.object({ dishId: z.string().min(1) }))
  .mutation(async ({ ctx, input }) => {
    const { userId } = ctx.principal

    // Verify the dish is in the list first
    const existing = await UserProfile.findOne({
      userId,
      'favorites.dishIds': input.dishId,
    })

    if (!existing) {
      const profile = await UserProfile.findOne({ userId })
      if (!profile) {
        throw new NotFoundError('User profile not found')
      }
      throw new NotFoundError('Dish not in favorites')
    }

    const profile = await UserProfile.findOneAndUpdate(
      { userId },
      { $pull: { 'favorites.dishIds': input.dishId } },
      { new: true },
    )

    if (!profile) {
      throw new NotFoundError('User profile not found')
    }

    await ctx.cache.invalidateFavorites(userId)

    return { chefIds: profile.favorites.chefIds, dishIds: profile.favorites.dishIds }
  })
