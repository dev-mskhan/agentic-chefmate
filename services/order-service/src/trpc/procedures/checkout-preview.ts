import { z } from 'zod'
import { protectedProcedure } from '../trpc'
import { validateChef, fetchDishSnapshot, checkChefAvailability } from '../../services/chef-client.service'
import { fetchAddressSnapshot } from '../../services/user-client.service'
import { calculatePricing } from '../../services/pricing.service'
import { validateCoupon } from '../../services/coupon.service'
import { ValidationError } from '@chefmate/errors'

const checkoutPreviewInput = z.object({
  chefId:       z.string().min(1),
  deliveryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  addressId:    z.string().min(1),
  items: z.array(z.object({
    dishId:   z.string().min(1),
    quantity: z.number().int().min(1).max(99),
  })).min(1).max(50),
  couponCode: z.string().optional(),
})

export const checkoutPreviewProcedure = protectedProcedure
  .input(checkoutPreviewInput)
  .query(async ({ ctx, input }) => {
    const { userId: customerId, email: customerEmail } = ctx.principal

    const chefResult = await validateChef(input.chefId)
    if (!chefResult.isEligible) throw new ValidationError(chefResult.reason ?? 'Chef not eligible')

    const availability = await checkChefAvailability(input.chefId, input.deliveryDate)
    if (!availability.available) throw new ValidationError(availability.reason ?? 'Chef not available')

    const dishSnapshots = await Promise.all(
      input.items.map((item) => fetchDishSnapshot(input.chefId, item.dishId)),
    )
    const currencies = [...new Set(dishSnapshots.map((d) => d.currency))]
    if (currencies.length > 1) throw new ValidationError('All dishes must share the same currency')

    await fetchAddressSnapshot(customerId, customerEmail, input.addressId)

    const itemSnapshots = input.items.map((item, idx) => {
      const dish = dishSnapshots[idx]!
      return { quantity: item.quantity, unitPrice: dish.price, currency: dish.currency }
    })

    const baseResult = calculatePricing({ items: itemSnapshots })

    let couponPreview: { couponCode: string; amount: number } | undefined
    if (input.couponCode) {
      const couponResult = await validateCoupon(
        input.couponCode, customerId, baseResult.subtotal, input.chefId,
      )
      couponPreview = { couponCode: couponResult.couponCode, amount: couponResult.discountAmount }
    }

    const finalResult = calculatePricing({
      items: itemSnapshots,
      discount: couponPreview,
    })

    return {
      subtotal:       finalResult.subtotal,
      deliveryFee:    finalResult.deliveryFee,
      discountAmount: finalResult.discountAmount,
      total:          finalResult.total,
      currency:       finalResult.currency,
      couponCode:     finalResult.couponCode,
    }
  })
