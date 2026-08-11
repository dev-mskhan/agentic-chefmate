import { z } from 'zod'
import { NotFoundError, ForbiddenError } from '@chefmate/errors'
import { protectedProcedure } from '../trpc'
import { MealPlan } from '../../models/meal-plan.model'
import { ChefProfile } from '../../models/chef-profile.model'

export const getPlanProcedure = protectedProcedure
  .input(z.object({ planId: z.string() }))
  .query(async ({ ctx, input }) => {
    const { userId, role } = ctx.principal

    const plan = await MealPlan.findById(input.planId).lean()
    if (!plan) throw new NotFoundError('Meal plan not found')

    if (plan.status !== 'ACTIVE') {
      if (role === 'ADMIN') return plan

      const chef = await ChefProfile.findById(plan.chefId).select('userId').lean()
      if (chef?.userId !== userId) throw new NotFoundError('Meal plan not found')
    }

    return plan
  })
