import { z } from 'zod'
import { NotFoundError } from '@chefmate/errors'
import { adminProcedure } from '../trpc'
import { ChefProfile, ChefVerificationStatusValues, ChefAccountStateValues } from '../../models/chef-profile.model'
import { publishChefEvent } from '../../services/event.service'

const updateChefStatusInput = z.object({
  chefId:             z.string(),
  verificationStatus: z.enum(ChefVerificationStatusValues).optional(),
  accountState:       z.enum(ChefAccountStateValues).optional(),
  reason:             z.string().optional(),
})

export const updateChefStatusProcedure = adminProcedure
  .input(updateChefStatusInput)
  .mutation(async ({ ctx, input }) => {
    const { chefId, reason } = input

    // Fetch by chefId
    const profile = await ChefProfile.findById(chefId)
    if (!profile) {
      throw new NotFoundError('Chef profile not found')
    }

    // Capture old status before update
    const oldVerificationStatus = profile.verificationStatus
    const oldAccountState       = profile.accountState

    // Build update fields
    const updateFields: Record<string, unknown> = {}
    if (input.verificationStatus !== undefined) updateFields['verificationStatus'] = input.verificationStatus
    if (input.accountState       !== undefined) updateFields['accountState']       = input.accountState

    const updated = await ChefProfile.findByIdAndUpdate(
      chefId,
      { $set: updateFields },
      { new: true },
    )

    if (!updated) {
      throw new NotFoundError('Chef profile not found')
    }

    // Invalidate cache
    await ctx.cache.invalidateProfile(chefId)

    // Build a combined status string for the event
    const oldStatus = input.verificationStatus !== undefined
      ? oldVerificationStatus
      : oldAccountState
    const newStatus = input.verificationStatus !== undefined
      ? updated.verificationStatus
      : updated.accountState

    // Publish event
    await publishChefEvent({
      type:      'chef.status_changed',
      chefId,
      oldStatus,
      newStatus,
      changedBy: ctx.principal.userId,
      reason,
      createdAt: new Date().toISOString(),
      version:   '1',
    })

    return {
      chefId:             updated._id.toString(),
      verificationStatus: updated.verificationStatus,
      accountState:       updated.accountState,
    }
  })
