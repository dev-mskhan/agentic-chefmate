import { NotFoundError } from '@chefmate/errors'
import { protectedProcedure } from '../trpc'
import { UserProfile } from '../../models/user-profile.model'

export const getAddressesProcedure = protectedProcedure.query(async ({ ctx }) => {
  const { userId } = ctx.principal

  // Check cache
  const cached = await ctx.cache.getAddresses(userId)
  if (cached) return cached

  // Load from MongoDB
  const profile = await UserProfile.findOne({ userId })
  if (!profile) {
    throw new NotFoundError('User profile not found')
  }

  const addresses = profile.addresses.map((a) => ({
    _id:                  a._id.toString(),
    label:                a.label,
    addressLine:          a.addressLine,
    city:                 a.city,
    postalCode:           a.postalCode,
    location:             a.location,
    deliveryInstructions: a.deliveryInstructions,
    isDefault:            a.isDefault,
  }))

  await ctx.cache.setAddresses(userId, addresses)
  return addresses
})
