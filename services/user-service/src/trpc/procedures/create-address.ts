import { z } from 'zod'
import { NotFoundError, ConflictError } from '@chefmate/errors'
import { protectedProcedure } from '../trpc'
import { UserProfile, AddressLabelValues } from '../../models/user-profile.model'

const locationInput = z.object({
  type:        z.literal('Point').default('Point'),
  coordinates: z.tuple([z.number(), z.number()]), // [lng, lat]
})

export const createAddressProcedure = protectedProcedure
  .input(z.object({
    label:                z.enum(AddressLabelValues),
    addressLine:          z.string().min(1),
    area:                 z.string().max(100).optional(),
    city:                 z.string().min(1),
    province:             z.string().max(60).optional(),
    postalCode:           z.string().optional(),
    location:             locationInput.optional(),
    deliveryInstructions: z.string().max(300).optional(),
    isDefault:            z.boolean().optional(),
  }))
  .mutation(async ({ ctx, input }) => {
    const { userId } = ctx.principal

    const profile = await UserProfile.findOne({ userId })
    if (!profile) throw new NotFoundError('User profile not found')

    if (profile.addresses.length >= 10) {
      throw new ConflictError('Maximum of 10 addresses allowed')
    }

    profile.addresses.push(input as any)
    await profile.save()
    await ctx.cache.invalidateAddresses(userId)

    const addr = profile.addresses[profile.addresses.length - 1]!
    return {
      _id:                  addr._id.toString(),
      label:                addr.label,
      addressLine:          addr.addressLine,
      area:                 addr.area,
      city:                 addr.city,
      province:             addr.province,
      postalCode:           addr.postalCode,
      location:             addr.location,
      deliveryInstructions: addr.deliveryInstructions,
      isDefault:            addr.isDefault,
    }
  })
