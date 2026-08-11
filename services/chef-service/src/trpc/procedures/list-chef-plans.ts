import { z } from 'zod'
import { protectedProcedure } from '../trpc'
import { MealPlan, PlanStatusValues, PlanTypeValues } from '../../models/meal-plan.model'
import { ChefProfile } from '../../models/chef-profile.model'

export const listChefPlansProcedure = protectedProcedure
  .input(z.object({
    chefId: z.string(),
    status: z.enum(PlanStatusValues).optional(),
    type:   z.enum(PlanTypeValues).optional(),
    limit:  z.number().int().min(1).max(100).default(20),
    offset: z.number().int().min(0).default(0),
  }))
  .query(async ({ ctx, input }) => {
    const { userId, role } = ctx.principal

    const isAdmin = role === 'ADMIN'
    let isOwner = false
    if (role === 'CHEF') {
      const chef = await ChefProfile.findOne({ userId }).select('_id').lean()
      isOwner = chef?._id.toString() === input.chefId
    }

    const filter: Record<string, unknown> = { chefId: input.chefId }

    // Customers see only ACTIVE plans
    if (!isAdmin && !isOwner) {
      filter['status'] = 'ACTIVE'
    } else if (input.status) {
      filter['status'] = input.status
    }

    if (input.type) filter['type'] = input.type

    const [plans, total] = await Promise.all([
      MealPlan.find(filter)
        .skip(input.offset)
        .limit(input.limit)
        .sort({ createdAt: -1 })
        .lean(),
      MealPlan.countDocuments(filter),
    ])

    return { plans, total }
  })
