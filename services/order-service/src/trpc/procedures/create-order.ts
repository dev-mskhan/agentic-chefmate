import { z } from 'zod'
import { protectedProcedure } from '../trpc'
import { Order } from '../../models/order.model'
import { validateChef, fetchDishSnapshot, checkChefAvailability } from '../../services/chef-client.service'
import { fetchAddressSnapshot } from '../../services/user-client.service'
import { calculatePricing } from '../../services/pricing.service'
import { incrementChefOrderCount } from '../../services/capacity.service'
import { publishOrderEvent } from '../../services/event.service'
import { ValidationError } from '@chefmate/errors'
import { createLogger } from '@chefmate/logger'

const logger = createLogger('create-order')

const createOrderInput = z.object({
  chefId:       z.string().min(1),
  deliveryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  addressId:    z.string().min(1),
  items: z.array(z.object({
    dishId:   z.string().min(1),
    quantity: z.number().int().min(1).max(99),
  })).min(1).max(50),
  customerNote:   z.string().max(500).optional(),
  idempotencyKey: z.string().max(128).optional(),
})

export const createOrderProcedure = protectedProcedure
  .input(createOrderInput)
  .mutation(async ({ ctx, input }) => {
    const { userId: customerId, email: customerEmail } = ctx.principal

    // ── Idempotency check ────────────────────────────────────────────────────
    if (input.idempotencyKey) {
      const existing = await Order.findOne({ idempotencyKey: input.idempotencyKey }).lean()
      if (existing) {
        logger.info({ orderId: existing._id, idempotencyKey: input.idempotencyKey }, 'Duplicate order suppressed')
        return existing
      }
    }

    // ── 1. Validate chef eligibility ─────────────────────────────────────────
    const chefResult = await validateChef(input.chefId)
    if (!chefResult.isEligible) {
      throw new ValidationError(chefResult.reason ?? 'Chef is not eligible to receive orders')
    }

    // ── 2. Check chef availability for the delivery date ─────────────────────
    const availability = await checkChefAvailability(input.chefId, input.deliveryDate)
    if (!availability.available) {
      throw new ValidationError(availability.reason ?? 'Chef is not available on the requested date')
    }

    // ── 3. Validate and snapshot dishes ──────────────────────────────────────
    // Fetch all dishes in parallel; each throws if not found/active/wrong chef
    const dishSnapshots = await Promise.all(
      input.items.map((item) => fetchDishSnapshot(input.chefId, item.dishId)),
    )

    // Ensure all dishes share the same currency
    const currencies = [...new Set(dishSnapshots.map((d) => d.currency))]
    if (currencies.length > 1) {
      throw new ValidationError('All dishes in an order must share the same currency')
    }

    // ── 4. Validate and snapshot delivery address ─────────────────────────────
    const addressSnapshot = await fetchAddressSnapshot(customerId, customerEmail, input.addressId)

    // ── 5. Build item snapshots ───────────────────────────────────────────────
    const itemSnapshots = input.items.map((item, idx) => {
      const dish = dishSnapshots[idx]!
      const subtotal = Math.round(item.quantity * dish.price * 100) / 100
      return {
        dishId:      dish.dishId,
        name:        dish.name,
        description: dish.description,
        quantity:    item.quantity,
        unitPrice:   dish.price,
        currency:    dish.currency,
        subtotal,
        dietaryTags: dish.dietaryTags,
        allergens:   dish.allergens,
      }
    })

    // ── 6. Calculate pricing server-side ──────────────────────────────────────
    const pricing = calculatePricing({ items: itemSnapshots })

    // ── 7. Persist the order ──────────────────────────────────────────────────
    const order = await Order.create({
      customerId,
      chefId:          input.chefId,
      deliveryDate:    input.deliveryDate,
      items:           itemSnapshots,
      deliveryAddress: addressSnapshot,
      pricing,
      customerNote:    input.customerNote,
      status:          'PENDING',
      idempotencyKey:  input.idempotencyKey,
    })

    const orderId = order._id.toString()

    // ── 8. Increment capacity counter ─────────────────────────────────────────
    // Do this AFTER the order is persisted so a crash before this point
    // doesn't consume capacity without creating an order.
    await incrementChefOrderCount(ctx.redis, input.chefId, input.deliveryDate)

    // ── 9. Publish domain event ───────────────────────────────────────────────
    await publishOrderEvent({
      type:        'order.created',
      orderId,
      userId:      customerId,
      chefId:      input.chefId,
      items:       itemSnapshots.map((i) => ({
        dishId:   i.dishId,
        name:     i.name,
        quantity: i.quantity,
        price:    i.unitPrice,
      })),
      totalAmount: pricing.total,
      createdAt:   new Date().toISOString(),
      version:     '1',
    })

    logger.info({ orderId, customerId, chefId: input.chefId }, 'Order created')

    return order.toObject()
  })
