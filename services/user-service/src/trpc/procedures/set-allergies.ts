import { z } from 'zod'
import { NotFoundError } from '@chefmate/errors'
import { protectedProcedure } from '../trpc'
import { UserProfile, AllergyValues } from '../../models/user-profile.model'

export const setAllergiesProcedure = protectedProcedure
  .input(
    z.object({
      allergies: z.array(z.enum(AllergyValues)),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const { userId } = ctx.principal

    const profile = await UserProfile.findOneAndUpdate(
      { userId },
      { $set: { allergies: input.allergies } },
      { new: true },
    )

    if (!profile) {
      throw new NotFoundError('User profile not found')
    }

    await ctx.cache.invalidatePreferences(userId)

    return profile.allergies
  })
