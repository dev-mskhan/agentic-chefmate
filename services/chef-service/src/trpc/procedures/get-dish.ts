import { z } from 'zod'
import { NotFoundError } from '@chefmate/errors'
import { protectedProcedure } from '../trpc'
import { Dish } from '../../models/dish.model'
import { ChefProfile } from '../../models/chef-profile.model'

const DISH_TTL = 300 // 5 minutes

export const getDishProcedure = protectedProcedure
  .input(z.object({ dishId: z.string() }))
  .query(async ({ ctx, input }) => {
    const { dishId } = input
    const { userId, role } = ctx.principal

    // Check cache first
    const cacheKey = `dish:${dishId}`
    try {
      const cached = await ctx.redis.get(cacheKey)
      if (cached) {
        const dish = JSON.parse(cached)
        // Still enforce visibility even for cached results
        if (dish.status !== 'ACTIVE') {
          const isOwner = await checkOwnership(userId, dish.chefId)
          if (!isOwner && role !== 'ADMIN') {
            throw new NotFoundError('Dish not found')
          }
        }
        return dish
      }
    } catch (err) {
      // If the error is NotFoundError, rethrow it; otherwise ignore cache errors
      if (err instanceof NotFoundError) throw err
    }

    // Cache miss — fetch from MongoDB
    const dish = await Dish.findById(dishId)
    if (!dish) {
      throw new NotFoundError('Dish not found')
    }

    // Visibility: non-ACTIVE dishes only visible to owner or admin
    if (dish.status !== 'ACTIVE') {
      const isOwner = await checkOwnership(userId, dish.chefId)
      if (!isOwner && role !== 'ADMIN') {
        throw new NotFoundError('Dish not found')
      }
    }

    const doc = dish.toObject()

    // Populate cache
    try {
      await ctx.redis.set(cacheKey, JSON.stringify(doc), 'EX', DISH_TTL)
    } catch {
      // Cache write failure is non-fatal
    }

    return doc
  })

async function checkOwnership(userId: string, chefId: string): Promise<boolean> {
  const chef = await ChefProfile.findById(chefId).select('userId').lean()
  return chef?.userId === userId
}
