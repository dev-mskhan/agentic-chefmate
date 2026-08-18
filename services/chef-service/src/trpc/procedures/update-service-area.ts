import { z } from 'zod'
import { NotFoundError, ForbiddenError } from '@chefmate/errors'
import { protectedProcedure } from '../trpc'
import { ChefProfile } from '../../models/chef-profile.model'
import { publishChefEvent } from '../../services/event.service'

const updateServiceAreaInput = z.object({
  city:        z.string().optional(),
  postalCodes: z.array(z.string()).optional(),
  coordinates: z.object({
    lat: z.number(),
    lng: z.number(),
  }).optional(),
  radiusKm: z.number().min(1).max(200).optional(),
})

export const updateServiceAreaProcedure = protectedProcedure
  .input(updateServiceAreaInput)
  .mutation(async ({ ctx, input }) => {
    const { userId, role } = ctx.principal

    // Find profile by userId from principal
    const profile = await ChefProfile.findOne({ userId })
    if (!profile) {
      throw new NotFoundError('Chef profile not found')
    }

    // Ownership check: must be owner or admin
    if (profile.userId !== userId && role !== 'ADMIN') {
      throw new ForbiddenError('You can only update your own profile')
    }

    // Build partial update with only present fields
    const updateFields: Record<string, unknown> = {}

    if (input.city !== undefined)        updateFields['serviceArea.city']        = input.city
    if (input.postalCodes !== undefined) updateFields['serviceArea.postalCodes'] = input.postalCodes
    if (input.coordinates !== undefined) {
      updateFields['serviceArea.coordinates'] = input.coordinates
      updateFields['serviceArea.location']    = {
        type:        'Point',
        coordinates: [input.coordinates.lng, input.coordinates.lat], // GeoJSON: [lng, lat]
      }
    }
    if (input.radiusKm !== undefined)    updateFields['serviceArea.radiusKm']    = input.radiusKm

    const updated = await ChefProfile.findOneAndUpdate(
      { userId },
      { $set: updateFields },
      { new: true },
    )

    if (!updated) {
      throw new NotFoundError('Chef profile not found')
    }

    const chefId = updated._id.toString()

    // Invalidate cache
    await ctx.cache.invalidateProfile(chefId)

    // Publish event
    await publishChefEvent({
      type:      'chef.service_area_updated',
      chefId,
      createdAt: new Date().toISOString(),
      version:   '1',
    })

    return updated.toObject()
  })
