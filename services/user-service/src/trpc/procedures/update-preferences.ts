import { z } from 'zod'
import { NotFoundError } from '@chefmate/errors'
import { protectedProcedure } from '../trpc'
import { UserProfile, DietaryPreferenceValues, AllergyValues, DislikedIngredientValues, SpiceLevelValues, CuisineCategoryValues } from '../../models/user-profile.model'
import { publishUserEvent } from '../../services/event.service'

export const updatePreferencesProcedure = protectedProcedure
  .input(
    z.object({
      dietaryPreferences:  z.array(z.enum(DietaryPreferenceValues)).optional(),
      allergies:           z.array(z.enum(AllergyValues)).optional(),
      dislikedIngredients: z.array(z.enum(DislikedIngredientValues)).optional(),
      spiceLevel:          z.enum(SpiceLevelValues).optional(),
      favoriteCuisines:    z.array(z.enum(CuisineCategoryValues)).optional(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const { userId } = ctx.principal

    const updateFields: Record<string, unknown> = {}
    if (input.dietaryPreferences  !== undefined) updateFields['dietaryPreferences']  = input.dietaryPreferences
    if (input.allergies           !== undefined) updateFields['allergies']           = input.allergies
    if (input.dislikedIngredients !== undefined) updateFields['dislikedIngredients'] = input.dislikedIngredients
    if (input.spiceLevel          !== undefined) updateFields['spiceLevel']          = input.spiceLevel
    if (input.favoriteCuisines    !== undefined) updateFields['favoriteCuisines']    = input.favoriteCuisines

    const profile = await UserProfile.findOneAndUpdate(
      { userId },
      { $set: updateFields },
      { new: true },
    )

    if (!profile) {
      throw new NotFoundError('User profile not found')
    }

    await ctx.cache.invalidatePreferences(userId)

    await publishUserEvent({
      type:                'user.preferences_updated',
      userId,
      dietaryPreferences:  profile.dietaryPreferences,
      allergies:           profile.allergies,
      dislikedIngredients: profile.dislikedIngredients,
      spiceLevel:          profile.spiceLevel,
      favoriteCuisines:    profile.favoriteCuisines,
      createdAt:           new Date().toISOString(),
      version:             '1',
    })

    return {
      dietaryPreferences:  profile.dietaryPreferences,
      allergies:           profile.allergies,
      dislikedIngredients: profile.dislikedIngredients,
      spiceLevel:          profile.spiceLevel,
      favoriteCuisines:    profile.favoriteCuisines,
    }
  })
