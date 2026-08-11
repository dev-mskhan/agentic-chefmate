import { z } from 'zod'
import { NotFoundError, ValidationError } from '@chefmate/errors'
import { protectedProcedure } from '../trpc'
import { Dish } from '../../models/dish.model'
import { requireDishOwnership, invalidateDishCache } from './update-dish'

export const deactivateDishProcedure = protectedProcedure
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

    // Status transition: only ACTIVE → INACTIVE
    if (dish.status !== 'ACTIVE') {
      throw new ValidationError(
        `Cannot deactivate dish from status '${dish.status}'. Must be ACTIVE.`,
      )
    }

    const updated = await Dish.findByIdAndUpdate(
      dishId,
      { $set: { status: 'INACTIVE' } },
      { new: true },
    )

    if (!updated) {
      throw new NotFoundError('Dish not found')
    }

    await invalidateDishCache(ctx.redis, dishId, dish.chefId)

    return updated.toObject()
  })
