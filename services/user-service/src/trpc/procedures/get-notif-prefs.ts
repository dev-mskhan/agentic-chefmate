import { NotFoundError } from '@chefmate/errors'
import { protectedProcedure } from '../trpc'
import { UserProfile } from '../../models/user-profile.model'

export const getNotifPrefsProcedure = protectedProcedure.query(async ({ ctx }) => {
  const { userId } = ctx.principal

  const profile = await UserProfile.findOne({ userId })
  if (!profile) throw new NotFoundError('User profile not found')

  return profile.notificationPreferences
})
