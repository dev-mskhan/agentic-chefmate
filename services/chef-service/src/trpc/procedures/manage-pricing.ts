import { z } from 'zod'
import { NotFoundError, ValidationError } from '@chefmate/errors'
import { protectedProcedure } from '../trpc'
import { Dish, ALLOWED_CURRENCIES } from '../../models/dish.model'
import { requireDishOwnership, invalidateDishCache } from './update-dish'
import { isValidPriceDecimal } from './create-dish'

export const managePricingProcedure = protectedProcedure
  .input(z.object({
    dishId:   z.string(),
    price:    z.number().positive().max(999999),
    currency: z.enum(ALLOWED_CURRENCIES).optional(),
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

    // ARCHIVED dishes cannot have pricing updated
    if (dish.status === 'ARCHIVED') {
      throw new ValidationError('Cannot update pricing for an archived dish')
    }

    // Validate price decimal places
    if (!isValidPriceDecimal(input.price)) {
      throw new ValidationError('Price must have at most 2 decimal places')
    }

    const updateFields: Record<string, unknown> = { price: input.price }
    if (input.currency !== undefined) {
      updateFields['currency'] = input.currency
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
