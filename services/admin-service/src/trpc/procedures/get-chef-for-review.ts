import { z } from 'zod'
import { TRPCError }         from '@trpc/server'
import { adminProcedure }    from '../trpc'
import { AdminChefProfile }  from '../../models/chef-profile.model'
import { AdminOrder }        from '../../models/order.model'
import { AdminReview }       from '../../models/review.model'

export const getChefForReviewProcedure = adminProcedure
  .input(z.object({ chefId: z.string().min(1) }))
  .query(async ({ input }) => {
    const chef = await AdminChefProfile.findOne({ userId: input.chefId }).lean()
    if (!chef) throw new TRPCError({ code: 'NOT_FOUND', message: 'Chef not found' })
    const [orderCount, reviewCount, rejectedReviews] = await Promise.all([
      AdminOrder.countDocuments({ chefId: input.chefId }),
      AdminReview.countDocuments({ chefId: input.chefId }),
      AdminReview.countDocuments({ chefId: input.chefId, status: 'REJECTED' }),
    ])
    return { ...(chef as any), orderCount, reviewCount, rejectedReviews }
  })
