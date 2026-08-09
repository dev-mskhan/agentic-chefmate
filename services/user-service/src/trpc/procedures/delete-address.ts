import { z } from 'zod'
import { NotFoundError } from '@chefmate/errors'
import { protectedProcedure } from '../trpc'
import { UserProfile } from '../../models/user-profile.model'
import mongoose from 'mongoose'

export const deleteAddressProcedure = protectedProcedure
  .input(z.object({ id: z.string() }))
  .mutation(async ({ ctx, input }) => {
    const { userId } = ctx.principal
    const { id } = input

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError('Address not found')
    }

    const result = await UserProfile.updateOne(
      { userId },
      { $pull: { addresses: { _id: new mongoose.Types.ObjectId(id) } } },
    )

    if (result.matchedCount === 0) {
      throw new NotFoundError('User profile not found')
    }
    if (result.modifiedCount === 0) {
      throw new NotFoundError('Address not found')
    }

    await ctx.cache.invalidateAddresses(userId)

    return { success: true }
  })
