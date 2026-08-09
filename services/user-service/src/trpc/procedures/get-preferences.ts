import { NotFoundError } from '@chefmate/errors'
import { protectedProcedure } from '../trpc'
import { UserProfile } from '../../models/user-profile.model'

export const getPreferencesProcedure = protectedProcedure.query(async ({ ctx }) => {
  const { userId } = ctx.principal

  // Check cache
  const cached = await ctx.cache.getPreferences(userId)
  if (cached) return cached

  // Load from MongoDB
  const profile = await UserProfile.findOne({ userId })
  if (!profile) {
    throw new NotFoundError('User profile not found')
  }

  const preferences = {
    dietaryPreferences:  profile.dietaryPreferences,
    allergies:           profile.allergies,
    dislikedIngredients: profile.dislikedIngredients,
    spiceLevel:          profile.spiceLevel,
    favoriteCuisines:    profile.favoriteCuisines,
  }

  await ctx.cache.setPreferences(userId, preferences)
  return preferences
})
