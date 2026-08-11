import { ValidationError } from '@chefmate/errors'
import { MealPlan, IMealPlan } from '../models/meal-plan.model'
import { ChefProfile } from '../models/chef-profile.model'
import { Dish } from '../models/dish.model'

/**
 * Validates all preconditions for activating a meal plan.
 * Throws ValidationError on the first failed condition.
 * Called by activate-plan.ts before setting status: 'ACTIVE'.
 */
export async function validatePlanActivation(plan: IMealPlan): Promise<void> {
  // 1. Must have at least one tier
  if (plan.tiers.length === 0) {
    throw new ValidationError('Plan must have at least one tier before activation')
  }

  // 2. Chef must be verified
  const chef = await ChefProfile.findById(plan.chefId)
    .select('verificationStatus')
    .lean()
  if (chef?.verificationStatus !== 'ACTIVE') {
    throw new ValidationError('Chef must have ACTIVE verification to activate a plan')
  }

  // 3. All dish IDs must be ACTIVE and belong to this chef
  const allDishIds = plan.tiers.flatMap((t) => t.dishIds)
  const uniqueDishIds = [...new Set(allDishIds)]

  if (uniqueDishIds.length > 0) {
    const dishes = await Dish.find({
      _id:    { $in: uniqueDishIds },
      chefId: plan.chefId,
      status: 'ACTIVE',
    })
      .select('_id')
      .lean()

    if (dishes.length !== uniqueDishIds.length) {
      throw new ValidationError(
        'All dishes in plan tiers must be ACTIVE and belong to this chef',
      )
    }
  }

  // 4. SUBSCRIPTION plans must have a frequency
  if (plan.type === 'SUBSCRIPTION' && !plan.frequency) {
    throw new ValidationError(
      'Subscription plans must have a frequency set before activation',
    )
  }
}
