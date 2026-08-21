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

    // Verify the address exists in the caller's profile BEFORE pulling.
    // Relying on updateOne's modifiedCount is unreliable: MongoDB can report
    // modifiedCount=1 for a $pull that removes nothing from an array (the
    // document is considered "updated" even with no net change), which would
    // let a user "delete" an address id that isn't theirs and get a false 200.
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

    await UserProfile.updateOne(
      { userId },
      { $pull: { addresses: { _id: new mongoose.Types.ObjectId(id) } } },
    )

    await ctx.cache.invalidateAddresses(userId)

    return { success: true }
  })
