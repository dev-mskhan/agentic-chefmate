import { z } from 'zod'
import { NotFoundError, ValidationError } from '@chefmate/errors'
import { protectedProcedure } from '../trpc'
import { Dish } from '../../models/dish.model'
import { requireDishOwnership, invalidateDishCache } from './update-dish'

const ingredientInputSchema = z.object({
  name:     z.string().min(1).max(80),
  quantity: z.number().positive(),
  unit:     z.string().min(1).max(20),
})

export const manageIngredientsProcedure = protectedProcedure
  .input(z.object({
    dishId:      z.string(),
    ingredients: z.array(ingredientInputSchema),
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

    if (input.ingredients.length > 50) {
      throw new ValidationError('Maximum 50 ingredients allowed per dish')
    }

    const updated = await Dish.findByIdAndUpdate(
      dishId,
      { $set: { ingredients: input.ingredients } },
      { new: true },
    )

    if (!updated) {
      throw new NotFoundError('Dish not found')
    }

    await invalidateDishCache(ctx.redis, dishId, dish.chefId)

    return updated.toObject()
  })
