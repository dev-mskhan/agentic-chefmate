import { z } from 'zod'
import { NotFoundError, ForbiddenError, ValidationError } from '@chefmate/errors'
import { protectedProcedure } from '../trpc'
import { Dish, ALLOWED_CURRENCIES } from '../../models/dish.model'
import { ChefProfile } from '../../models/chef-profile.model'
import { publishChefEvent } from '../../services/event.service'
import { CuisineCategoryValues } from '../../constants'
import { isValidPriceDecimal } from './create-dish'

const ingredientInputSchema = z.object({
  name:     z.string().min(1).max(80),
  quantity: z.number().positive(),
  unit:     z.string().min(1).max(20),
})

const updateDishInput = z.object({
  dishId:      z.string(),
  name:        z.string().min(2).max(100).trim().optional(),
  description: z.string().max(500).optional(),
  ingredients: z.array(ingredientInputSchema).max(50).optional(),
  price:       z.number().positive().max(999999).optional(),
  currency:    z.enum(ALLOWED_CURRENCIES).optional(),
  portionInfo: z.string().max(200).optional(),
  cuisine:     z.enum(CuisineCategoryValues).optional(),
  category:    z.string().max(60).optional(),
})

export const updateDishProcedure = protectedProcedure
  .input(updateDishInput)
  .mutation(async ({ ctx, input }) => {
    const { dishId } = input
    const { userId, role } = ctx.principal

    const dish = await Dish.findById(dishId)
    if (!dish) {
      throw new NotFoundError('Dish not found')
    }

    // Ownership check
    await requireDishOwnership(userId, role, dish.chefId)

    // ARCHIVED dishes cannot be updated
    if (dish.status === 'ARCHIVED') {
      throw new ValidationError('Cannot update an archived dish')
    }

    // Validate price decimal places
    if (input.price !== undefined && !isValidPriceDecimal(input.price)) {
      throw new ValidationError('Price must have at most 2 decimal places')
    }

    const updateFields: Record<string, unknown> = {}
    const changedFields: string[] = []

    const fieldMap: Array<[keyof typeof input, string]> = [
      ['name', 'name'],
      ['description', 'description'],
      ['ingredients', 'ingredients'],
      ['price', 'price'],
      ['currency', 'currency'],
      ['portionInfo', 'portionInfo'],
      ['cuisine', 'cuisine'],
      ['category', 'category'],
    ]

    for (const [key, fieldName] of fieldMap) {
      if (input[key] !== undefined) {
        updateFields[fieldName] = input[key]
        changedFields.push(fieldName)
      }
    }

    const updated = await Dish.findByIdAndUpdate(
      dishId,
      { $set: updateFields },
      { new: true },
    )

    if (!updated) {
      throw new NotFoundError('Dish not found')
    }

    // Invalidate caches
    await invalidateDishCache(ctx.redis, dishId, dish.chefId)

    await publishChefEvent({
      type:          'dish.updated',
      dishId,
      chefId:        dish.chefId,
      changedFields,
      createdAt:     new Date().toISOString(),
      version:       '1',
    })

    return updated.toObject()
  })

export async function requireDishOwnership(
  userId: string,
  role: string,
  chefId: string,
): Promise<void> {
  if (role === 'ADMIN') return

  const chef = await ChefProfile.findById(chefId).select('userId').lean()
  if (chef?.userId !== userId) {
    throw new ForbiddenError('You can only modify your own dishes')
  }
}

export async function invalidateDishCache(
  redis: { del: (...keys: string[]) => Promise<unknown> },
  dishId: string,
  chefId: string,
): Promise<void> {
  await Promise.all([
    redis.del(`dish:${dishId}`),
    redis.del(`chef:${chefId}:dishes:ACTIVE`),
  ])
}
