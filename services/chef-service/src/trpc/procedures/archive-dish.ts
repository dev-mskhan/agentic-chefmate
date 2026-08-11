import { z } from 'zod'
import { NotFoundError, ValidationError } from '@chefmate/errors'
import { protectedProcedure } from '../trpc'
import { Dish } from '../../models/dish.model'
import { publishChefEvent } from '../../services/event.service'
import { requireDishOwnership, invalidateDishCache } from './update-dish'

export const archiveDishProcedure = protectedProcedure
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

    if (dish.status === 'ARCHIVED') {
      throw new ValidationError('Dish is already archived')
    }

    const updated = await Dish.findByIdAndUpdate(
      dishId,
      { $set: { status: 'ARCHIVED' } },
      { new: true },
    )

    if (!updated) {
      throw new NotFoundError('Dish not found')
    }

    await invalidateDishCache(ctx.redis, dishId, dish.chefId)

    await publishChefEvent({
      type:      'dish.archived',
      dishId,
      chefId:    dish.chefId,
      createdAt: new Date().toISOString(),
      version:   '1',
    })

    return updated.toObject()
  })
