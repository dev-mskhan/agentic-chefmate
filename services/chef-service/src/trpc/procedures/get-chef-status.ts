import { z } from 'zod'
import { NotFoundError } from '@chefmate/errors'
import { protectedProcedure } from '../trpc'
import { ChefProfile } from '../../models/chef-profile.model'

export const getChefStatusProcedure = protectedProcedure
  .input(z.object({ chefId: z.string() }))
  .query(async ({ input }) => {
    const { chefId } = input

    const profile = await ChefProfile.findById(chefId)
    if (!profile) {
      throw new NotFoundError('Chef profile not found')
    }

    return {
      chefId:             profile._id.toString(),
      verificationStatus: profile.verificationStatus,
      accountState:       profile.accountState,
    }
  })
