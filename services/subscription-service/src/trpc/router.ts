import { router } from './trpc'
import { createSubscriptionProcedure } from './procedures/create-subscription'
import { getSubscriptionProcedure } from './procedures/get-subscription'
import { listMySubscriptionsProcedure } from './procedures/list-my-subscriptions'
import { pauseSubscriptionProcedure } from './procedures/pause-subscription'
import { resumeSubscriptionProcedure } from './procedures/resume-subscription'
import { skipSubscriptionProcedure } from './procedures/skip-subscription'
import { swapSubscriptionDishProcedure } from './procedures/swap-subscription-dish'
import { cancelSubscriptionProcedure } from './procedures/cancel-subscription'

export const appRouter = router({
  createSubscription:    createSubscriptionProcedure,
  getSubscription:       getSubscriptionProcedure,
  listMySubscriptions:   listMySubscriptionsProcedure,
  pauseSubscription:     pauseSubscriptionProcedure,
  resumeSubscription:    resumeSubscriptionProcedure,
  skipSubscription:      skipSubscriptionProcedure,
  swapSubscriptionDish:  swapSubscriptionDishProcedure,
  cancelSubscription:    cancelSubscriptionProcedure,
})

export type AppRouter = typeof appRouter
