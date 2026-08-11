import { z } from 'zod'
import { NotFoundError, ValidationError } from '@chefmate/errors'
import { protectedProcedure } from '../trpc'
import { Dish } from '../../models/dish.model'
import { ChefProfile } from '../../models/chef-profile.model'
import { requireDishOwnership, invalidateDishCache } from './update-dish'

export const activateDishProcedure = protectedProcedure
  .input(z.object({ dishId: z.string() }))
  .mutation(async ({ ctx, input }) => {
    const { dishId } = input
    const { userId, role } = ctx.principal

    const dish = await Dish.findById(dishId)
    if (!dish) {
      throw new NotFoundError('Dish not found')
    }

    // Ownership check
    await requireDishOwnership(userId, role, dish.chefId)

    // Status transition: only DRAFT or INACTIVE → ACTIVE
    if (dish.status !== 'DRAFT' && dish.status !== 'INACTIVE') {
      throw new ValidationError(
        `Cannot activate dish from status '${dish.status}'. Must be DRAFT or INACTIVE.`,
      )
    }

    // Chef must have ACTIVE verification status
    const chef = await ChefProfile.findById(dish.chefId)
    if (!chef || chef.verificationStatus !== 'ACTIVE') {
      throw new ValidationError(
        'Chef must have ACTIVE verification status to publish dishes',
      )
    }

    const updated = await Dish.findByIdAndUpdate(
      dishId,
      { $set: { status: 'ACTIVE' } },
      { new: true },
    )

    if (!updated) {
      throw new NotFoundError('Dish not found')
    }

    await invalidateDishCache(ctx.redis, dishId, dish.chefId)

    return updated.toObject()
  })
