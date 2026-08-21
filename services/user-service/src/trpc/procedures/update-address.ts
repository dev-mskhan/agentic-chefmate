import { z } from 'zod'
import { NotFoundError } from '@chefmate/errors'
import { protectedProcedure } from '../trpc'
import { UserProfile, AddressLabelValues } from '../../models/user-profile.model'
import mongoose from 'mongoose'

const locationInput = z.object({
  type:        z.literal('Point').default('Point'),
  coordinates: z.tuple([z.number(), z.number()]), // [lng, lat]
})

export const updateAddressProcedure = protectedProcedure
  .input(z.object({
    id:                   z.string(),
    label:                z.enum(AddressLabelValues).optional(),
    addressLine:          z.string().min(1).optional(),
    area:                 z.string().max(100).optional(),
    city:                 z.string().min(1).optional(),
    province:             z.string().max(60).optional(),
    postalCode:           z.string().optional(),
    location:             locationInput.optional(),
    deliveryInstructions: z.string().max(300).optional(),
    isDefault:            z.boolean().optional(),
  }))
  .mutation(async ({ ctx, input }) => {
    const { userId } = ctx.principal
    const { id, ...fields } = input

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError('Address not found')
    }

    // Verify the address exists in the caller's profile BEFORE updating.
    // Relying on updateOne's modifiedCount is unreliable: MongoDB can report
    // modifiedCount=1 even when the arrayFilters match no subdocument to
    // change (the document is considered "updated" with no net change), which
    // would let a user "update" an address id that isn't theirs and get a
    // false 200.
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

    const updateSet: Record<string, unknown> = {}
    if (fields.label                !== undefined) updateSet['addresses.$[elem].label']                = fields.label
    if (fields.addressLine          !== undefined) updateSet['addresses.$[elem].addressLine']          = fields.addressLine
    if (fields.area                 !== undefined) updateSet['addresses.$[elem].area']                 = fields.area
    if (fields.city                 !== undefined) updateSet['addresses.$[elem].city']                 = fields.city
    if (fields.province             !== undefined) updateSet['addresses.$[elem].province']             = fields.province
    if (fields.postalCode           !== undefined) updateSet['addresses.$[elem].postalCode']           = fields.postalCode
    if (fields.location             !== undefined) updateSet['addresses.$[elem].location']             = fields.location
    if (fields.deliveryInstructions !== undefined) updateSet['addresses.$[elem].deliveryInstructions'] = fields.deliveryInstructions
    if (fields.isDefault            !== undefined) updateSet['addresses.$[elem].isDefault']            = fields.isDefault

    await UserProfile.updateOne(
      { userId },
      { $set: updateSet },
      { arrayFilters: [{ 'elem._id': new mongoose.Types.ObjectId(id) }] },
    )

    await ctx.cache.invalidateAddresses(userId)
    return { success: true }
  })
