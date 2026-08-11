import { z } from 'zod'
import { NotFoundError, ForbiddenError, ValidationError } from '@chefmate/errors'
import { protectedProcedure } from '../trpc'
import { MealPlan } from '../../models/meal-plan.model'
import { ChefProfile } from '../../models/chef-profile.model'
import { ALLOWED_CURRENCIES } from '../../models/dish.model'
import { publishChefEvent } from '../../services/event.service'

export const updatePlanProcedure = protectedProcedure
  .input(z.object({
    planId:      z.string(),
    name:        z.string().min(2).max(100).trim().optional(),
    description: z.string().max(1000).optional(),
    basePrice:   z.number().min(0.01).optional(),
    currency:    z.enum(ALLOWED_CURRENCIES).optional(),
    availabilityRules: z.object({
      startDate:      z.string().optional(),
      endDate:        z.string().optional(),
      maxSubscribers: z.number().int().min(1).optional(),
    }).optional(),
    pauseRules: z.object({
      allowPause:   z.boolean().optional(),
      maxPauseDays: z.number().int().min(1).max(90).optional(),
    }).optional(),
    skipRules: z.object({
      allowSkip:      z.boolean().optional(),
      minNoticeHours: z.number().int().min(1).max(168).optional(),
    }).optional(),
    swapRules: z.object({
      allowSwap:       z.boolean().optional(),
      swapWindowHours: z.number().int().min(1).max(72).optional(),
    }).optional(),
  }))
  .mutation(async ({ ctx, input }) => {
    const { userId, role } = ctx.principal
    const { planId, ...fields } = input

    const plan = await MealPlan.findById(planId)
    if (!plan) throw new NotFoundError('Meal plan not found')

    if (role !== 'ADMIN') {
      const chef = await ChefProfile.findById(plan.chefId).select('userId').lean()
      if (chef?.userId !== userId) throw new ForbiddenError('Access denied')
    }

    if (plan.status === 'ARCHIVED') {
      throw new ValidationError('Cannot update an archived plan')
    }

    const updateFields: Record<string, unknown> = {}
    const changedFields: string[] = []

    for (const [key, val] of Object.entries(fields)) {
      if (val !== undefined) {
        updateFields[key] = val
        changedFields.push(key)
      }
    }

    const updated = await MealPlan.findByIdAndUpdate(
      planId,
      { $set: updateFields },
      { new: true },
    )
    if (!updated) throw new NotFoundError('Meal plan not found')

    void publishChefEvent({
      type:          'plan.updated',
      planId,
      chefId:        plan.chefId,
      changedFields,
      createdAt:     new Date().toISOString(),
      version:       '1',
    })

    return updated.toObject()
  })
