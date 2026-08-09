import { z } from 'zod'
import { NotFoundError, ConflictError } from '@chefmate/errors'
import { protectedProcedure } from '../trpc'
import { UserProfile, AddressLabelValues } from '../../models/user-profile.model'

export const createAddressProcedure = protectedProcedure
  .input(
    z.object({
      label:                z.enum(AddressLabelValues),
      addressLine:          z.string().min(1),
      city:                 z.string().min(1),
      postalCode:           z.string().optional(),
      coordinates:          z.object({ lat: z.number(), lng: z.number() }).optional(),
      deliveryInstructions: z.string().max(300).optional(),
      isDefault:            z.boolean().optional(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const { userId } = ctx.principal

    const profile = await UserProfile.findOne({ userId })
    if (!profile) {
      throw new NotFoundError('User profile not found')
    }

    if (profile.addresses.length >= 10) {
      throw new ConflictError('Maximum of 10 addresses allowed')
    }

    profile.addresses.push(input as any)
    await profile.save()

    await ctx.cache.invalidateAddresses(userId)

    const newAddress = profile.addresses[profile.addresses.length - 1]
    return {
      _id:                  newAddress._id.toString(),
      label:                newAddress.label,
      addressLine:          newAddress.addressLine,
      city:                 newAddress.city,
      postalCode:           newAddress.postalCode,
      coordinates:          newAddress.coordinates,
      deliveryInstructions: newAddress.deliveryInstructions,
      isDefault:            newAddress.isDefault,
    }
  })
