import { z } from 'zod'
import { NotFoundError, ForbiddenError, ValidationError } from '@chefmate/errors'
import { protectedProcedure } from '../trpc'
import { MealPlan } from '../../models/meal-plan.model'
import { ChefProfile } from '../../models/chef-profile.model'
import { publishChefEvent } from '../../services/event.service'
import { validatePlanActivation } from '../../domain/plan-activation'

export const activatePlanProcedure = protectedProcedure
  .input(z.object({ planId: z.string() }))
  .mutation(async ({ ctx, input }) => {
    const { userId, role } = ctx.principal

    const plan = await MealPlan.findById(input.planId)
    if (!plan) throw new NotFoundError('Meal plan not found')

    if (role !== 'ADMIN') {
      const chef = await ChefProfile.findById(plan.chefId).select('userId').lean()
      if (chef?.userId !== userId) throw new ForbiddenError('Access denied')
    }

    if (plan.status !== 'DRAFT' && plan.status !== 'PAUSED') {
      throw new ValidationError(
        `Cannot activate plan from status '${plan.status}'. Must be DRAFT or PAUSED.`,
      )
    }

    await validatePlanActivation(plan)

    const updated = await MealPlan.findByIdAndUpdate(
      input.planId,
      { $set: { status: 'ACTIVE' } },
      { new: true },
    )
    if (!updated) throw new NotFoundError('Meal plan not found')

    void publishChefEvent({
      type:      'plan.activated',
      planId:    input.planId,
      chefId:    plan.chefId,
      createdAt: new Date().toISOString(),
      version:   '1',
    })

    return updated.toObject()
  })
