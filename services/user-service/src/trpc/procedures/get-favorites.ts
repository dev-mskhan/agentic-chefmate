import { NotFoundError } from '@chefmate/errors'
import { protectedProcedure } from '../trpc'
import { UserProfile } from '../../models/user-profile.model'

export const getFavoritesProcedure = protectedProcedure.query(async ({ ctx }) => {
  const { userId } = ctx.principal

  // Check cache
  const cached = await ctx.cache.getFavorites(userId)
  if (cached) return cached

  // Load from MongoDB
  const profile = await UserProfile.findOne({ userId })
  if (!profile) {
    throw new NotFoundError('User profile not found')
  }

  const favorites = {
    chefIds: profile.favorites.chefIds,
    dishIds: profile.favorites.dishIds,
  }

  await ctx.cache.setFavorites(userId, favorites)
  return favorites
})
