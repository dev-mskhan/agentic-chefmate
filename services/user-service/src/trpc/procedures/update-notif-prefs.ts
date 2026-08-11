import { z } from 'zod'
import { NotFoundError } from '@chefmate/errors'
import { protectedProcedure } from '../trpc'
import { UserProfile } from '../../models/user-profile.model'

const channelsInput = z.object({
  push:  z.boolean().optional(),
  email: z.boolean().optional(),
  sms:   z.boolean().optional(),
  inApp: z.boolean().optional(),
})

const categoriesInput = z.object({
  orderUpdates:        z.boolean().optional(),
  chefMessages:        z.boolean().optional(),
  promotions:          z.boolean().optional(),
  subscriptionUpdates: z.boolean().optional(),
  paymentUpdates:      z.boolean().optional(),
})

const quietHoursInput = z.object({
  enabled: z.boolean().optional(),
  start:   z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Must be HH:MM').optional(),
  end:     z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Must be HH:MM').optional(),
})

export const updateNotifPrefsProcedure = protectedProcedure
  .input(z.object({
    channels:   channelsInput.optional(),
    categories: categoriesInput.optional(),
    quietHours: quietHoursInput.optional(),
  }))
  .mutation(async ({ ctx, input }) => {
    const { userId } = ctx.principal

    const setFields: Record<string, unknown> = {}

    if (input.channels) {
      for (const [k, v] of Object.entries(input.channels)) {
        if (v !== undefined) setFields[`notificationPreferences.channels.${k}`] = v
      }
    }
    if (input.categories) {
      for (const [k, v] of Object.entries(input.categories)) {
        if (v !== undefined) setFields[`notificationPreferences.categories.${k}`] = v
      }
    }
    if (input.quietHours) {
      for (const [k, v] of Object.entries(input.quietHours)) {
        if (v !== undefined) setFields[`notificationPreferences.quietHours.${k}`] = v
      }
    }

    const profile = await UserProfile.findOneAndUpdate(
      { userId },
      { $set: setFields },
      { new: true },
    )
    if (!profile) throw new NotFoundError('User profile not found')

    await ctx.cache.invalidateProfile(userId)
    return profile.notificationPreferences
  })
