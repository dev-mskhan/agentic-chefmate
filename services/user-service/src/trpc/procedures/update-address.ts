import { z } from 'zod'
import { NotFoundError } from '@chefmate/errors'
import { protectedProcedure } from '../trpc'
import { UserProfile, AddressLabelValues } from '../../models/user-profile.model'
import mongoose from 'mongoose'

export const updateAddressProcedure = protectedProcedure
  .input(
    z.object({
      id:                   z.string(),
      label:                z.enum(AddressLabelValues).optional(),
      addressLine:          z.string().min(1).optional(),
      city:                 z.string().min(1).optional(),
      postalCode:           z.string().optional(),
      coordinates:          z.object({ lat: z.number(), lng: z.number() }).optional(),
      deliveryInstructions: z.string().max(300).optional(),
      isDefault:            z.boolean().optional(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const { userId } = ctx.principal
    const { id, ...fields } = input

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError('Address not found')
    }

    // Build $set update for positional arrayFilters
    const updateSet: Record<string, unknown> = {}
    if (fields.label                !== undefined) updateSet['addresses.$[elem].label']                = fields.label
    if (fields.addressLine          !== undefined) updateSet['addresses.$[elem].addressLine']          = fields.addressLine
    if (fields.city                 !== undefined) updateSet['addresses.$[elem].city']                 = fields.city
    if (fields.postalCode           !== undefined) updateSet['addresses.$[elem].postalCode']           = fields.postalCode
    if (fields.coordinates          !== undefined) updateSet['addresses.$[elem].coordinates']          = fields.coordinates
    if (fields.deliveryInstructions !== undefined) updateSet['addresses.$[elem].deliveryInstructions'] = fields.deliveryInstructions
    if (fields.isDefault            !== undefined) updateSet['addresses.$[elem].isDefault']            = fields.isDefault

    const result = await UserProfile.updateOne(
      { userId },
      { $set: updateSet },
      { arrayFilters: [{ 'elem._id': new mongoose.Types.ObjectId(id) }] },
    )

    if (result.matchedCount === 0) {
      throw new NotFoundError('User profile not found')
    }
    if (result.modifiedCount === 0) {
      // Address _id not found in array
      throw new NotFoundError('Address not found')
    }

    await ctx.cache.invalidateAddresses(userId)

    return { success: true }
  })
