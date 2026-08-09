import { z } from 'zod'
import { NotFoundError } from '@chefmate/errors'
import { protectedProcedure } from '../trpc'
import { UserProfile } from '../../models/user-profile.model'
import mongoose from 'mongoose'

export const setDefaultAddressProcedure = protectedProcedure
  .input(z.object({ id: z.string() }))
  .mutation(async ({ ctx, input }) => {
    const { userId } = ctx.principal
    const { id } = input

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError('Address not found')
    }

    // Verify the address exists first
    const profile = await UserProfile.findOne({ userId })
    if (!profile) {
      throw new NotFoundError('User profile not found')
    }

    const addressExists = profile.addresses.some(
      (a) => a._id.toString() === id,
    )
    if (!addressExists) {
      throw new NotFoundError('Address not found')
    }

    // Step 1: Clear all isDefault flags
    await UserProfile.updateOne(
      { userId },
      { $set: { 'addresses.$[].isDefault': false } },
    )

    // Step 2: Set the target address as default
    await UserProfile.updateOne(
      { userId, 'addresses._id': new mongoose.Types.ObjectId(id) },
      { $set: { 'addresses.$.isDefault': true } },
    )

    await ctx.cache.invalidateAddresses(userId)

    return { success: true }
  })
