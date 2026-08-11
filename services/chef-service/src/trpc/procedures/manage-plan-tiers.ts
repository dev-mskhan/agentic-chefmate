import { z } from 'zod'
import { NotFoundError, ForbiddenError, ValidationError } from '@chefmate/errors'
import { protectedProcedure } from '../trpc'
import { MealPlan } from '../../models/meal-plan.model'
import { ChefProfile } from '../../models/chef-profile.model'
import { Dish } from '../../models/dish.model'

const planTierInput = z.object({
  name:            z.string().max(60),
  description:     z.string().max(300).optional(),
  dishIds:         z.array(z.string()).min(1).max(20),
  portionsPerDish: z.number().int().min(1).max(99).optional(),
  priceOverride:   z.number().min(0.01).optional(),
  notes:           z.string().max(200).optional(),
})

export const managePlanTiersProcedure = protectedProcedure
  .input(z.object({
    planId: z.string(),
    tiers:  z.array(planTierInput).max(5),
  }))
  .mutation(async ({ ctx, input }) => {
    const { userId, role } = ctx.principal

    const plan = await MealPlan.findById(input.planId)
    if (!plan) throw new NotFoundError('Meal plan not found')

    if (role !== 'ADMIN') {
      const chef = await ChefProfile.findById(plan.chefId).select('userId').lean()
      if (chef?.userId !== userId) throw new ForbiddenError('Access denied')
    }

    if (plan.status === 'ARCHIVED') {
      throw new ValidationError('Cannot update tiers of an archived plan')
    }

    // Validate all dishIds belong to this chef
    const allDishIds = input.tiers.flatMap((t) => t.dishIds)
    const uniqueDishIds = [...new Set(allDishIds)]

    if (uniqueDishIds.length > 0) {
      const dishes = await Dish.find({
        _id:    { $in: uniqueDishIds },
        chefId: plan.chefId,
      })
        .select('_id')
        .lean()

      if (dishes.length !== uniqueDishIds.length) {
        throw new ValidationError('One or more dish IDs do not belong to this chef')
      }
    }

    const updated = await MealPlan.findByIdAndUpdate(
      input.planId,
      { $set: { tiers: input.tiers } },
      { new: true, runValidators: true },
    )
    if (!updated) throw new NotFoundError('Meal plan not found')

    return updated.toObject()
  })
