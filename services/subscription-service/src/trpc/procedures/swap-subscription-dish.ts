import { z } from 'zod'
import { protectedProcedure } from '../trpc'
import { Subscription } from '../../models/subscription.model'
import { fetchPlanSnapshot, fetchDishForSwapValidation } from '../../services/chef-client.service'
import { publishSubscriptionEvent } from '../../services/event.service'
import { periodStartKey } from '../../utils/date.utils'
import { NotFoundError, ForbiddenError, ValidationError } from '@chefmate/errors'

export const swapSubscriptionDishProcedure = protectedProcedure
  .input(z.object({
    subscriptionId: z.string().min(1),
    oldDishId:      z.string().min(1),
    newDishId:      z.string().min(1),
  }))
  .mutation(async ({ ctx, input }) => {
    const sub = await Subscription.findById(input.subscriptionId)
    if (!sub) throw new NotFoundError('Subscription not found')
    if (sub.customerId !== ctx.principal.userId && ctx.principal.role !== 'ADMIN') {
      throw new ForbiddenError('You can only swap dishes in your own subscriptions')
    }
    if (sub.status !== 'ACTIVE') throw new ValidationError(`Cannot swap dishes in a ${sub.status} subscription`)

    const plan = await fetchPlanSnapshot(sub.planId, sub.chefId)
    if (!plan.swapRules.allowSwap) throw new ValidationError('This plan does not allow dish swapping')

    // Check swap window deadline
    if (plan.swapRules.swapWindowHours) {
      const deadlineMs = plan.swapRules.swapWindowHours * 60 * 60 * 1000
      const timeUntilBilling = sub.nextBillingDate.getTime() - Date.now()
      if (timeUntilBilling < deadlineMs) {
        throw new ValidationError(`Swap window has closed — must swap at least ${plan.swapRules.swapWindowHours}h before next billing`)
      }
    }

    // Validate old dish exists in subscription
    if (!sub.selectedDishIds.includes(input.oldDishId)) {
      throw new ValidationError(`Dish ${input.oldDishId} is not in your current subscription`)
    }

    // Validate new dish is active and belongs to this chef
    await fetchDishForSwapValidation(sub.chefId, input.newDishId)

    // Validate new dish is in any tier of the plan
    const allPlanDishIds = plan.tiers.flatMap((t) => t.dishIds)
    if (!allPlanDishIds.includes(input.newDishId)) {
      throw new ValidationError(`Dish ${input.newDishId} is not available in this plan`)
    }

    // Apply swap for future periods only — does not touch already-created orders
    const updatedDishIds = sub.selectedDishIds.map((id) => id === input.oldDishId ? input.newDishId : id)
    sub.selectedDishIds = updatedDishIds
    await sub.save()

    await publishSubscriptionEvent({
      type: 'subscription.swapped', subscriptionId: input.subscriptionId,
      customerId: sub.customerId, planId: sub.planId, chefId: sub.chefId,
      oldDishId: input.oldDishId, newDishId: input.newDishId,
      effectivePeriod: periodStartKey(sub.nextBillingDate),
      createdAt: new Date().toISOString(), version: '1',
    })

    return sub.toObject()
  })
