import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { userProcedure } from '../trpc'
import { Order } from '../../models/order.model'
import { Payment } from '../../models/payment.model'
import { Eligibility } from '../../models/eligibility.model'
import { Review } from '../../models/review.model'
import { ChefProfile } from '../../models/chef-profile.model'

export const getMyOrderProcedure = userProcedure
  .input(z.object({ orderId: z.string().min(1) }))
  .query(async ({ ctx, input }) => {
    const userId = ctx.principal.userId

    // 1. Fetch order
    const order = await Order.findById(input.orderId).lean()
    if (!order) throw new TRPCError({ code: 'NOT_FOUND', message: 'Order not found' })

    // 2. IDOR check
    if ((order as any).customerId !== userId) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' })
    }

    // 3. Parallel enrichment
    const orderId = input.orderId
    const chefId  = (order as any).chefId as string

    const [payment, eligibility, publishedReview, chefProfile] = await Promise.all([
      Payment.findOne({ orderId }).select('status refundedAmountCents currency amountCents').lean(),
      Eligibility.findOne({ orderId, customerId: userId }).lean(),
      Review.findOne({ orderId, customerId: userId, status: 'PUBLISHED' }).lean(),
      ChefProfile.findOne({ userId: chefId }).select('displayName').lean(),
    ])

    return {
      _id:                (order as any)._id,
      status:             (order as any).status,
      orderType:          (order as any).orderType,
      items:              (order as any).items ?? [],
      pricing:            (order as any).pricing,
      createdAt:          (order as any).createdAt,
      chefDisplayName:    (chefProfile as any)?.displayName ?? null,
      paymentStatus:      (payment as any)?.status ?? null,
      isEligibleForReview: !!eligibility && !publishedReview,
    }
  })
