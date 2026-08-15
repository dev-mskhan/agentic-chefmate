import { z } from 'zod'
import { ConflictError, ValidationError } from '@chefmate/errors'
import { protectedProcedure } from '../trpc'
import { ChefProfile } from '../../models/chef-profile.model'
import { publishChefEvent } from '../../services/event.service'
import { CUISINE_CATEGORIES } from '../../constants/cuisine-categories'

const serviceAreaInput = z.object({
  city:        z.string().optional(),
  postalCodes: z.array(z.string()).optional(),
  coordinates: z.object({
    lat: z.number(),
    lng: z.number(),
  }).optional(),
  radiusKm: z.number().min(1).max(200).optional(),
})

const createChefProfileInput = z.object({
  displayName:        z.string().min(2).max(60).trim(),
  bio:                z.string().max(1000).optional(),
  phone:              z.string().min(7).optional(),
  cuisineSpecialties: z.array(z.string()).optional(),
  serviceArea:        serviceAreaInput.optional(),
})

export const createChefProfileProcedure = protectedProcedure
  .input(createChefProfileInput)
  .mutation(async ({ ctx, input }) => {
    const { userId } = ctx.principal

    // Validate cuisineSpecialties against allowed values
    if (input.cuisineSpecialties && input.cuisineSpecialties.length > 0) {
      const invalidCuisines = input.cuisineSpecialties.filter(
        (c) => !(CUISINE_CATEGORIES as readonly string[]).includes(c),
      )
      if (invalidCuisines.length > 0) {
        throw new ValidationError(`Invalid cuisine categories: ${invalidCuisines.join(', ')}`)
      }

      // Check for duplicates
      const unique = new Set(input.cuisineSpecialties)
      if (unique.size !== input.cuisineSpecialties.length) {
        throw new ValidationError('Duplicate cuisine categories are not allowed')
      }
    }

    // Check for existing profile
    const existing = await ChefProfile.findOne({ userId })
    if (existing) {
      throw new ConflictError('Chef profile already exists for this user')
    }

    // Create the profile
    const profile = await ChefProfile.create({
      userId,
      displayName:        input.displayName,
      bio:                input.bio,
      phone:              input.phone,
      cuisineSpecialties: input.cuisineSpecialties ?? [],
      serviceArea:        input.serviceArea,
      verificationStatus: 'PENDING',
      accountState:       'INACTIVE',
    })

    const chefId = profile._id.toString()
    const doc    = profile.toObject()

    // Cache userId → chefId mapping
    await ctx.cache.setUserChefId(userId, chefId)

    // Publish event
    await publishChefEvent({
      type:        'chef.created',
      chefId,
      userId,
      displayName: profile.displayName,
      createdAt:   new Date().toISOString(),
      version:     '1',
    })

    return doc
  })
