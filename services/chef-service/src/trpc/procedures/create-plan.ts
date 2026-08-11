import { z } from 'zod'
import { NotFoundError, ValidationError } from '@chefmate/errors'
import { chefProcedure } from '../trpc'
import { MealPlan, PlanTypeValues, PlanFrequencyValues, PlanStatusValues } from '../../models/meal-plan.model'
import { ChefProfile } from '../../models/chef-profile.model'
import { ALLOWED_CURRENCIES } from '../../models/dish.model'
import { publishChefEvent } from '../../services/event.service'

export const createPlanProcedure = chefProcedure
  .input(z.object({
    name:        z.string().min(2).max(100).trim(),
    description: z.string().max(1000).optional(),
    type:        z.enum(PlanTypeValues),
    frequency:   z.enum(PlanFrequencyValues).optional(),
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
    mediaIds: z.array(z.string().min(1)).max(5).optional(),
  }))
  .mutation(async ({ ctx, input }) => {
    const { userId } = ctx.principal

    // Frequency rules
    if (input.type === 'SUBSCRIPTION' && !input.frequency) {
      throw new ValidationError('Subscription plans must have a frequency')
    }
    if (input.type === 'ONE_OFF' && input.frequency) {
      throw new ValidationError('ONE_OFF plans must not have a frequency')
    }

    const chef = await ChefProfile.findOne({ userId }).select('_id').lean()
    if (!chef) throw new NotFoundError('Chef profile not found')
    const chefId = chef._id.toString()

    const plan = await MealPlan.create({
      chefId,
      name:              input.name,
      description:       input.description,
      type:              input.type,
      frequency:         input.frequency,
      status:            'DRAFT',
      basePrice:         input.basePrice,
      currency:          input.currency ?? 'PKR',
      availabilityRules: input.availabilityRules,
      pauseRules:        input.pauseRules,
      skipRules:         input.skipRules,
      swapRules:         input.swapRules,
      mediaIds:          input.mediaIds ? [...new Set(input.mediaIds)] : [],
    })

    void publishChefEvent({
      type:      'plan.created',
      planId:    plan._id.toString(),
      chefId,
      name:      plan.name,
      planType:  plan.type,
      createdAt: new Date().toISOString(),
      version:   '1',
    })

    return plan.toObject()
  })
