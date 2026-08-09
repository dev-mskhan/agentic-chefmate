import { NotFoundError } from '@chefmate/errors'
import { protectedProcedure } from '../trpc'
import { UserProfile } from '../../models/user-profile.model'

export const getAllergiesProcedure = protectedProcedure.query(async ({ ctx }) => {
  const { userId } = ctx.principal

  // Try preferences cache first
  const cached = await ctx.cache.getPreferences(userId)
  if (cached) return cached.allergies

  // Load from MongoDB
  const profile = await UserProfile.findOne({ userId })
  if (!profile) {
    throw new NotFoundError('User profile not found')
  }

  return profile.allergies
})
