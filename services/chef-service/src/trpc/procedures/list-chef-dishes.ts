import { z } from 'zod'
import { protectedProcedure } from '../trpc'
import { Dish, DishStatusValues } from '../../models/dish.model'
import { ChefProfile } from '../../models/chef-profile.model'
import { CuisineCategoryValues, DietaryTagValues } from '../../constants'

const LIST_TTL = 180 // 3 minutes

export const listChefDishesProcedure = protectedProcedure
  .input(z.object({
    chefId:      z.string(),
    status:      z.enum(DishStatusValues).optional(),
    cuisine:     z.string().optional(),
    cuisines:    z.array(z.enum(CuisineCategoryValues)).optional(),
    dietaryTags: z.array(z.enum(DietaryTagValues)).optional(),
    limit:       z.number().int().min(1).max(100).default(20),
    offset:      z.number().int().min(0).default(0),
  }))
  .query(async ({ ctx, input }) => {
    const { chefId, cuisine, cuisines, dietaryTags, limit, offset } = input
    const { userId, role } = ctx.principal

    // Determine if caller is the owning chef
    const isAdmin = role === 'ADMIN'
    let isChefOwner = false

    if (role === 'CHEF') {
      const chef = await ChefProfile.findOne({ userId }).select('_id').lean()
      isChefOwner = chef?._id.toString() === chefId
    }

    // Build status filter based on role
    let statusFilter: unknown
    if (isAdmin) {
      // Admin sees everything; respect explicit status filter if provided
      statusFilter = input.status ? input.status : undefined
    } else if (isChefOwner) {
      // Owner chef can filter by any status or see all
      statusFilter = input.status ? input.status : undefined
    } else {
      // Customers and other users only see ACTIVE
      statusFilter = 'ACTIVE'
    }

    // Check cache only for first-page ACTIVE list
    const isFirstPage = offset === 0 && limit >= 20
    const cacheKey = `chef:${chefId}:dishes:ACTIVE`
    if (!input.status || input.status === 'ACTIVE') {
      if (!isChefOwner && !isAdmin && isFirstPage) {
        try {
          const cached = await ctx.redis.get(cacheKey)
          if (cached) {
            return JSON.parse(cached) as { dishes: unknown[]; total: number }
          }
        } catch {
          // Cache read failure is non-fatal
        }
      }
    }

    // Build query
    const filter: Record<string, unknown> = { chefId }
    if (statusFilter !== undefined) {
      filter['status'] = statusFilter
    }
    if (cuisine) {
      filter['cuisine'] = cuisine
    }
    // Multi-cuisine filter (OR semantics via $in)
    if (cuisines && cuisines.length > 0) {
      filter['cuisine'] = { $in: cuisines }
    }
    // Dietary tags filter (AND semantics via $all — dish must have ALL requested tags)
    if (dietaryTags && dietaryTags.length > 0) {
      filter['dietaryTags'] = { $all: dietaryTags }
    }

    const [dishes, total] = await Promise.all([
      Dish.find(filter)
        .skip(offset)
        .limit(Math.min(limit, 100))
        .sort({ createdAt: -1 })
        .lean(),
      Dish.countDocuments(filter),
    ])

    const result = { dishes, total }

    // Cache first-page ACTIVE list
    if (statusFilter === 'ACTIVE' && isFirstPage && !isChefOwner && !isAdmin) {
      try {
        await ctx.redis.set(cacheKey, JSON.stringify(result), 'EX', LIST_TTL)
      } catch {
        // Cache write failure is non-fatal
      }
    }

    return result
  })
