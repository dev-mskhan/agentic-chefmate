import { z } from 'zod'
import { NotFoundError } from '@chefmate/errors'
import { protectedProcedure } from '../trpc'
import { UserProfile } from '../../models/user-profile.model'
import { publishUserEvent } from '../../services/event.service'

export const updateMeProcedure = protectedProcedure
  .input(
    z.object({
      firstName:    z.string().min(1).max(100).optional(),
      lastName:     z.string().min(1).max(100).optional(),
      phone:        z.string().optional(),
      profileImage: z.string().url().optional(),
      dateOfBirth:  z.string().datetime().optional(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const { userId } = ctx.principal

    const updateFields: Record<string, unknown> = {}
    if (input.firstName    !== undefined) updateFields['firstName']    = input.firstName
    if (input.lastName     !== undefined) updateFields['lastName']     = input.lastName
    if (input.phone        !== undefined) updateFields['phone']        = input.phone
    if (input.profileImage !== undefined) updateFields['profileImage'] = input.profileImage
    if (input.dateOfBirth  !== undefined) updateFields['dateOfBirth']  = new Date(input.dateOfBirth)

    const profile = await UserProfile.findOneAndUpdate(
      { userId },
      { $set: updateFields },
      { new: true, upsert: true },
    )

    if (!profile) {
      throw new NotFoundError('User profile not found')
    }

    await ctx.cache.invalidateProfile(userId)

    await publishUserEvent({
      type:         'user.profile_updated',
      userId,
      firstName:    profile.firstName,
      lastName:     profile.lastName,
      phone:        profile.phone,
      profileImage: profile.profileImage,
      createdAt:    new Date().toISOString(),
      version:      '1',
    })

    return profile.toObject()
  })
