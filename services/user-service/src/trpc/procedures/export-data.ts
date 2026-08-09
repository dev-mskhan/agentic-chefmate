import { NotFoundError, RateLimitError } from '@chefmate/errors'
import { protectedProcedure } from '../trpc'
import { UserProfile } from '../../models/user-profile.model'

export const exportDataProcedure = protectedProcedure.query(async ({ ctx }) => {
  const { userId } = ctx.principal

  // Rate limit: max 1 export per 60-minute window
  const allowed = await ctx.cache.checkExportRateLimit(userId)
  if (!allowed) {
    throw new RateLimitError('Export rate limit exceeded — please wait before requesting another export')
  }

  // Bypass cache — always load fresh from MongoDB for data export
  const profile = await UserProfile.findOne({ userId })
  if (!profile) {
    throw new NotFoundError('User profile not found')
  }

  return profile.toObject()
})
