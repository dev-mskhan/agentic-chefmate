import { z } from 'zod'
import { NotFoundError, ValidationError } from '@chefmate/errors'
import { protectedProcedure } from '../trpc'
import { Dish } from '../../models/dish.model'
import { requireDishOwnership, invalidateDishCache } from './update-dish'

export const manageDishMediaProcedure = protectedProcedure
  .input(z.object({
    dishId:   z.string(),
    mediaIds: z.array(z.string().min(1)),
  }))
  .mutation(async ({ ctx, input }) => {
    const { dishId } = input
    const { userId, role } = ctx.principal

    const dish = await Dish.findById(dishId)
    if (!dish) {
      throw new NotFoundError('Dish not found')
    }

    // Ownership check
    await requireDishOwnership(userId, role, dish.chefId)

    // Deduplicate
    const mediaIds = [...new Set(input.mediaIds)]

    if (mediaIds.length > 10) {
      throw new ValidationError('Maximum 10 media references allowed per dish')
    }

    const updated = await Dish.findByIdAndUpdate(
      dishId,
      { $set: { mediaIds } },
      { new: true },
    )

    if (!updated) {
      throw new NotFoundError('Dish not found')
    }

    await invalidateDishCache(ctx.redis, dishId, dish.chefId)

    return updated.toObject()
  })
