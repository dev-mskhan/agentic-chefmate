import { z } from 'zod'
import { protectedProcedure } from '../trpc'
import { Order } from '../../models/order.model'
import { validateChef, fetchDishSnapshot, checkChefAvailability } from '../../services/chef-client.service'
import { fetchAddressSnapshot } from '../../services/user-client.service'
import { calculatePricing } from '../../services/pricing.service'
import { validateCoupon } from '../../services/coupon.service'
import { commitCouponUsage, rollbackCouponUsage } from '../../services/coupon-usage.service'
import { incrementChefOrderCount } from '../../services/capacity.service'
import { createPaymentForOrder } from '../../services/payment-client.service'
import { publishOrderEvent } from '../../services/event.service'
import { ValidationError } from '@chefmate/errors'
import { createLogger } from '@chefmate/logger'

const logger = createLogger('checkout')

const checkoutInput = z.object({
  chefId:         z.string().min(1),
  deliveryDate:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  addressId:      z.string().min(1),
  items: z.array(z.object({
    dishId:   z.string().min(1),
    quantity: z.number().int().min(1).max(99),
  })).min(1).max(50),
  couponCode:     z.string().optional(),
  customerNote:   z.string().max(500).optional(),
  idempotencyKey: z.string().max(128).optional(),
})

export const checkoutProcedure = protectedProcedure
  .input(checkoutInput)
  .mutation(async ({ ctx, input }) => {
    const { userId: customerId, email: customerEmail } = ctx.principal

    // ── Idempotency: return existing order+payment if already processed ───────
    if (input.idempotencyKey) {
      const existing = await Order.findOne({ idempotencyKey: input.idempotencyKey }).lean()
      if (existing) {
        logger.info({ orderId: existing._id, idempotencyKey: input.idempotencyKey }, 'Duplicate checkout suppressed')
        return { order: existing, clientSecret: null, paymentId: null }
      }
    }

    // ── 1. Validate chef ───────────────────────────────────────────────────────
    const chefResult = await validateChef(input.chefId)
    if (!chefResult.isEligible) throw new ValidationError(chefResult.reason ?? 'Chef not eligible')

    // ── 2. Validate availability ───────────────────────────────────────────────
    const availability = await checkChefAvailability(input.chefId, input.deliveryDate)
    if (!availability.available) throw new ValidationError(availability.reason ?? 'Chef not available')

    // ── 3. Validate & snapshot dishes ─────────────────────────────────────────
    const dishSnapshots = await Promise.all(
      input.items.map((item) => fetchDishSnapshot(input.chefId, item.dishId)),
    )
    const currencies = [...new Set(dishSnapshots.map((d) => d.currency))]
    if (currencies.length > 1) throw new ValidationError('All dishes must share the same currency')

    // ── 4. Validate & snapshot address ────────────────────────────────────────
    const addressSnapshot = await fetchAddressSnapshot(customerId, customerEmail, input.addressId)

    // ── 5. Build item snapshots ────────────────────────────────────────────────
    const itemSnapshots = input.items.map((item, idx) => {
      const dish = dishSnapshots[idx]!
      const subtotal = Math.round(item.quantity * dish.price * 100) / 100
      return {
        dishId: dish.dishId, name: dish.name, description: dish.description,
        quantity: item.quantity, unitPrice: dish.price, currency: dish.currency,
        subtotal, dietaryTags: dish.dietaryTags, allergens: dish.allergens,
      }
    })

    // ── 6. Base pricing ────────────────────────────────────────────────────────
    const baseResult = calculatePricing({ items: itemSnapshots })

    // ── 7. Validate coupon (do NOT commit yet) ─────────────────────────────────
    let couponValidation: { couponId: string; couponCode: string; discountAmount: number } | undefined
    if (input.couponCode) {
      couponValidation = await validateCoupon(
        input.couponCode, customerId, baseResult.subtotal, input.chefId,
      )
    }

    // ── 8. Final pricing with discount ────────────────────────────────────────
    const pricing = calculatePricing({
      items: itemSnapshots,
      discount: couponValidation
        ? { amount: couponValidation.discountAmount, couponCode: couponValidation.couponCode }
        : undefined,
    })

    // ── 9. Create order ────────────────────────────────────────────────────────
    const order = await Order.create({
      customerId, chefId: input.chefId, deliveryDate: input.deliveryDate,
      items: itemSnapshots, deliveryAddress: addressSnapshot,
      pricing, customerNote: input.customerNote,
      status: 'PENDING', idempotencyKey: input.idempotencyKey,
    })
    const orderId = order._id.toString()

    // ── 10. Increment capacity counter ────────────────────────────────────────
    await incrementChefOrderCount(ctx.redis, input.chefId, input.deliveryDate)

    // ── 11. Create payment (call payment-service) ─────────────────────────────
    // Amount in smallest currency unit (cents / paisa)
    const amountCents = Math.round(pricing.total * 100)
    let paymentResult: { paymentId: string; clientSecret: string }
    try {
      paymentResult = await createPaymentForOrder(
        orderId, customerId, amountCents, pricing.currency, input.idempotencyKey,
      )
    } catch (err) {
      // Roll back coupon usage if payment creation fails
      if (couponValidation) {
        await rollbackCouponUsage(couponValidation.couponId, customerId, orderId).catch(() => {})
      }
      throw err
    }

    // ── 12. Commit coupon usage (only after payment created) ──────────────────
    if (couponValidation) {
      await commitCouponUsage(couponValidation.couponId, customerId, orderId)
    }

    // ── 13. Publish order.created event ───────────────────────────────────────
    await publishOrderEvent({
      type: 'order.created', orderId, userId: customerId, chefId: input.chefId,
      items: itemSnapshots.map((i) => ({ dishId: i.dishId, name: i.name, quantity: i.quantity, price: i.unitPrice })),
      totalAmount: pricing.total,
      createdAt: new Date().toISOString(), version: '1',
    })

    logger.info({ orderId, customerId, chefId: input.chefId, paymentId: paymentResult.paymentId }, 'Checkout complete')

    return {
      order:        order.toObject(),
      paymentId:    paymentResult.paymentId,
      clientSecret: paymentResult.clientSecret,
    }
  })
