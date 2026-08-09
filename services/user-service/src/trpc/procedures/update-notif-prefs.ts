import { z } from 'zod'
import { NotFoundError } from '@chefmate/errors'
import { protectedProcedure } from '../trpc'
import { UserProfile } from '../../models/user-profile.model'

export const updateNotifPrefsProcedure = protectedProcedure
  .input(
    z.object({
      orderUpdates: z.boolean().optional(),
      promotions:   z.boolean().optional(),
      chefMessages: z.boolean().optional(),
      email:        z.boolean().optional(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const { userId } = ctx.principal

    const updateFields: Record<string, unknown> = {}
    if (input.orderUpdates !== undefined) updateFields['notificationPreferences.orderUpdates'] = input.orderUpdates
    if (input.promotions   !== undefined) updateFields['notificationPreferences.promotions']   = input.promotions
    if (input.chefMessages !== undefined) updateFields['notificationPreferences.chefMessages'] = input.chefMessages
    if (input.email        !== undefined) updateFields['notificationPreferences.email']        = input.email

    const profile = await UserProfile.findOneAndUpdate(
      { userId },
      { $set: updateFields },
      { new: true },
    )

    if (!profile) {
      throw new NotFoundError('User profile not found')
    }

    await ctx.cache.invalidateProfile(userId)

    return {
      orderUpdates: profile.notificationPreferences.orderUpdates,
      promotions:   profile.notificationPreferences.promotions,
      chefMessages: profile.notificationPreferences.chefMessages,
      email:        profile.notificationPreferences.email,
    }
  })
