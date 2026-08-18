import { router } from './trpc'

import { createReviewProcedure }    from './procedures/create-review'
import { replyToReviewProcedure }   from './procedures/reply-to-review'
import { listChefReviewsProcedure } from './procedures/list-chef-reviews'
import { listDishReviewsProcedure } from './procedures/list-dish-reviews'
import { listPlanReviewsProcedure } from './procedures/list-plan-reviews'
import { getReviewProcedure }       from './procedures/get-review'
import { moderateReviewProcedure }  from './procedures/moderate-review'

export const appRouter = router({
  createReview:    createReviewProcedure,
  replyToReview:   replyToReviewProcedure,
  listChefReviews: listChefReviewsProcedure,
  listDishReviews: listDishReviewsProcedure,
  listPlanReviews: listPlanReviewsProcedure,
  getReview:       getReviewProcedure,
  moderateReview:  moderateReviewProcedure,
})

export type AppRouter = typeof appRouter
