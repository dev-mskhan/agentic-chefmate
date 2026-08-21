import { z } from 'zod'
import { NotFoundError, ForbiddenError } from '@chefmate/errors'
import { protectedProcedure } from '../trpc'
import { MealPlan } from '../../models/meal-plan.model'
import { ChefProfile } from '../../models/chef-profile.model'
import { validateMediaOwnership } from '../../services/media-validation.service'

export const managePlanMediaProcedure = protectedProcedure
  .input(z.object({
    planId:   z.string(),
    mediaIds: z.array(z.string().min(1)).max(5),
  }))
  .mutation(async ({ ctx, input }) => {
    const { userId, role } = ctx.principal

    const plan = await MealPlan.findById(input.planId)
    if (!plan) throw new NotFoundError('Meal plan not found')

    // Resolve the ownerId for media validation — the chef's userId
    let ownerId = userId
    if (role !== 'ADMIN') {
      const chef = await ChefProfile.findById(plan.chefId).select('userId').lean()
      if (chef?.userId !== userId) throw new ForbiddenError('Access denied')
      ownerId = chef.userId
    } else {
      // Admin — resolve the chef's userId from the plan
      const chef = await ChefProfile.findById(plan.chefId).select('userId').lean()
      if (chef) ownerId = chef.userId
    }

    const deduplicated = [...new Set(input.mediaIds)]

    // Validate media ownership — each mediaId must exist, be READY, and belong
    // to the chef who owns this plan.
    await validateMediaOwnership(
      ctx.config.MEDIA_SERVICE_URL!,
      ctx.config.INTERNAL_SECRET!,
      deduplicated,
      ownerId,
    )

    const updated = await MealPlan.findByIdAndUpdate(
      input.planId,
      { $set: { mediaIds: deduplicated } },
      { new: true },
    )
    if (!updated) throw new NotFoundError('Meal plan not found')

    return updated.toObject()
  })
