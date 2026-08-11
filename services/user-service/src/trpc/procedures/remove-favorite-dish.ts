import { z } from 'zod'
import { NotFoundError } from '@chefmate/errors'
import { protectedProcedure } from '../trpc'
import { UserProfile } from '../../models/user-profile.model'

export const removeFavoriteDishProcedure = protectedProcedure
  .input(z.object({ dishId: z.string().min(1) }))
  .mutation(async ({ ctx, input }) => {
    const { userId } = ctx.principal

    const profile = await UserProfile.findOneAndUpdate(
      { userId },
      { $pull: { 'favorites.dishIds': input.dishId } },
      { new: true },
    )
    if (!profile) throw new NotFoundError('User profile not found')

    await ctx.cache.invalidateFavorites(userId)
    return { chefIds: profile.favorites.chefIds, dishIds: profile.favorites.dishIds, planIds: profile.favorites.planIds }
  })
