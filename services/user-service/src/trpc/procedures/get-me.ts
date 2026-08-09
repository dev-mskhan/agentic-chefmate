import { NotFoundError } from '@chefmate/errors'
import { protectedProcedure } from '../trpc'
import { UserProfile } from '../../models/user-profile.model'

export const getMeProcedure = protectedProcedure.query(async ({ ctx }) => {
  const { userId } = ctx.principal

  // Check cache first
  const cached = await ctx.cache.getProfile(userId)
  if (cached) {
    // Return full doc from cache if available, otherwise fall through
    // (cache holds a subset; for full doc we still need MongoDB on cache miss)
  }

  // Always load full document (cache only stores partial data for perf)
  const profile = await UserProfile.findOne({ userId })
  if (!profile) {
    throw new NotFoundError('User profile not found')
  }

  // Populate cache with profile subset
  await ctx.cache.setProfile(userId, {
    userId:       profile.userId,
    firstName:    profile.firstName,
    lastName:     profile.lastName,
    phone:        profile.phone,
    profileImage: profile.profileImage,
    dateOfBirth:  profile.dateOfBirth?.toISOString(),
  })

  return profile.toObject()
})
