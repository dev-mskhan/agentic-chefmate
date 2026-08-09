import { z } from 'zod'
import { NotFoundError, ForbiddenError } from '@chefmate/errors'
import { protectedProcedure } from '../trpc'
import { ChefProfile } from '../../models/chef-profile.model'
import { publishChefEvent } from '../../services/event.service'

const updateChefProfileInput = z.object({
  displayName: z.string().min(2).max(60).trim().optional(),
  bio:         z.string().max(1000).optional(),
  phone:       z.string().min(7).optional(),
})

export const updateChefProfileProcedure = protectedProcedure
  .input(updateChefProfileInput)
  .mutation(async ({ ctx, input }) => {
    const { userId, role } = ctx.principal

    // Find profile by userId from principal
    const profile = await ChefProfile.findOne({ userId })
    if (!profile) {
      throw new NotFoundError('Chef profile not found')
    }

    // Ownership check: must be owner or admin
    if (profile.userId !== userId && role !== 'ADMIN') {
      throw new ForbiddenError('You can only update your own profile')
    }

    // Build partial update with only present fields
    const updateFields: Record<string, unknown> = {}
    const changedFields: string[] = []

    if (input.displayName !== undefined) {
      updateFields['displayName'] = input.displayName
      changedFields.push('displayName')
    }
    if (input.bio !== undefined) {
      updateFields['bio'] = input.bio
      changedFields.push('bio')
    }
    if (input.phone !== undefined) {
      updateFields['phone'] = input.phone
      changedFields.push('phone')
    }

    const updated = await ChefProfile.findOneAndUpdate(
      { userId },
      { $set: updateFields },
      { new: true },
    )

    if (!updated) {
      throw new NotFoundError('Chef profile not found')
    }

    const chefId = updated._id.toString()

    // Invalidate cache
    await ctx.cache.invalidateProfile(chefId)

    // Publish event
    await publishChefEvent({
      type:         'chef.updated',
      chefId,
      changedFields,
      createdAt:    new Date().toISOString(),
      version:      '1',
    })

    return updated.toObject()
  })
