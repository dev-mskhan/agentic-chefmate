import { z } from 'zod'
import { NotFoundError, ForbiddenError } from '@chefmate/errors'
import { protectedProcedure } from '../trpc'
import { ChefProfile } from '../../models/chef-profile.model'
import { publishChefEvent } from '../../services/event.service'
import { CuisineCategoryValues } from '../../constants'

const updateCuisineSpecialtiesInput = z.object({
  cuisineSpecialties: z.array(z.enum(CuisineCategoryValues)),
})

export const updateCuisineSpecialtiesProcedure = protectedProcedure
  .input(updateCuisineSpecialtiesInput)
  .mutation(async ({ ctx, input }) => {
    const { userId, role } = ctx.principal

    // Check for duplicates
    const unique = new Set(input.cuisineSpecialties)
    if (unique.size !== input.cuisineSpecialties.length) {
      throw new ValidationError('Duplicate cuisine categories are not allowed')
    }

    // Find profile by userId from principal
    const profile = await ChefProfile.findOne({ userId })
    if (!profile) {
      throw new NotFoundError('Chef profile not found')
    }

    // Ownership check: must be owner or admin
    if (profile.userId !== userId && role !== 'ADMIN') {
      throw new ForbiddenError('You can only update your own profile')
    }

    const updated = await ChefProfile.findOneAndUpdate(
      { userId },
      { $set: { cuisineSpecialties: input.cuisineSpecialties } },
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
      type:               'chef.specialties_updated',
      chefId,
      cuisineSpecialties: input.cuisineSpecialties,
      createdAt:          new Date().toISOString(),
      version:            '1',
    })

    return updated.toObject()
  })
