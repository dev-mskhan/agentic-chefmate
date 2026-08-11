import { z } from 'zod'
import { NotFoundError } from '@chefmate/errors'
import { protectedProcedure } from '../trpc'
import { Dish, WEEK_DAYS } from '../../models/dish.model'
import { requireDishOwnership, invalidateDishCache } from './update-dish'

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/

export const manageAvailabilityProcedure = protectedProcedure
  .input(z.object({
    dishId:         z.string(),
    isAvailable:    z.boolean().optional(),
    availableDays:  z.array(z.enum(WEEK_DAYS)).optional(),
    availableFrom:  z.string().regex(TIME_REGEX, 'Must be HH:MM format').optional(),
    availableUntil: z.string().regex(TIME_REGEX, 'Must be HH:MM format').optional(),
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

    const updateFields: Record<string, unknown> = {}

    if (input.isAvailable !== undefined) {
      updateFields['availability.isAvailable'] = input.isAvailable
    }
    if (input.availableDays !== undefined) {
      updateFields['availability.availableDays'] = input.availableDays
    }
    if (input.availableFrom !== undefined) {
      updateFields['availability.availableFrom'] = input.availableFrom
    }
    if (input.availableUntil !== undefined) {
      updateFields['availability.availableUntil'] = input.availableUntil
    }

    const updated = await Dish.findByIdAndUpdate(
      dishId,
      { $set: updateFields },
      { new: true },
    )

    if (!updated) {
      throw new NotFoundError('Dish not found')
    }

    await invalidateDishCache(ctx.redis, dishId, dish.chefId)

    return updated.toObject()
  })
