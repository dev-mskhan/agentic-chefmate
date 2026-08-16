import { z } from 'zod'
import { protectedProcedure } from '../trpc'
import { validateCoupon } from '../../services/coupon.service'

export const validateCouponProcedure = protectedProcedure
  .input(z.object({
    couponCode: z.string().min(1),
    subtotal:   z.number().min(0),
    chefId:     z.string().optional(),
  }))
  .query(async ({ ctx, input }) => {
    const result = await validateCoupon(
      input.couponCode,
      ctx.principal.userId,
      input.subtotal,
      input.chefId,
    )
    return result
  })
