import { z } from 'zod'
import { NotFoundError, ForbiddenError } from '@chefmate/errors'
import { protectedProcedure } from '../trpc'
import { MealPlan } from '../../models/meal-plan.model'
import { ChefProfile } from '../../models/chef-profile.model'

export const managePlanMediaProcedure = protectedProcedure
  .input(z.object({
    planId:   z.string(),
    mediaIds: z.array(z.string().min(1)).max(5),
  }))
  .mutation(async ({ ctx, input }) => {
    const { userId, role } = ctx.principal

    const plan = await MealPlan.findById(input.planId)
    if (!plan) throw new NotFoundError('Meal plan not found')

    if (role !== 'ADMIN') {
      const chef = await ChefProfile.findById(plan.chefId).select('userId').lean()
      if (chef?.userId !== userId) throw new ForbiddenError('Access denied')
    }

    const deduplicated = [...new Set(input.mediaIds)]

    const updated = await MealPlan.findByIdAndUpdate(
      input.planId,
      { $set: { mediaIds: deduplicated } },
      { new: true },
    )
    if (!updated) throw new NotFoundError('Meal plan not found')

    return updated.toObject()
  })
