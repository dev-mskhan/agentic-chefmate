/**
 * Internal order creation endpoint for subscription-service.
 * POST /internal/subscriptions/orders
 * Protected by X-Internal-Secret. Subscription Service calls this to generate
 * a recurring order. All Phase 1 validations run here.
 */
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { Order } from '../../models/order.model'
import { validateChef, fetchDishSnapshot, checkChefAvailability } from '../../services/chef-client.service'
import { calculatePricing } from '../../services/pricing.service'
import { incrementChefOrderCount } from '../../services/capacity.service'
import { createPaymentForOrder } from '../../services/payment-client.service'
import { publishOrderEvent } from '../../services/event.service'
import { config } from '../../config'
import { createLogger } from '@chefmate/logger'
import type Redis from 'ioredis'

const logger = createLogger('internal-order-routes')

const addressSnapshotSchema = z.object({
  addressId:            z.string(),
  label:                z.string(),
  addressLine:          z.string(),
  area:                 z.string().optional(),
  city:                 z.string(),
  province:             z.string().optional(),
  postalCode:           z.string().optional(),
  location:             z.object({ type: z.literal('Point'), coordinates: z.tuple([z.number(), z.number()]) }).optional(),
  deliveryInstructions: z.string().optional(),
})

const createRecurringOrderBody = z.object({
  subscriptionId:  z.string().min(1),
  customerId:      z.string().min(1),
  customerEmail:   z.string().email(),
  chefId:          z.string().min(1),
  deliveryDate:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  items:           z.array(z.object({ dishId: z.string().min(1), quantity: z.number().int().min(1) })).min(1).max(50),
  addressSnapshot: addressSnapshotSchema,
  currency:        z.string().min(1),
  idempotencyKey:  z.string().min(1),
})

export async function internalOrderRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post('/subscriptions/orders', async (req, res) => {
    if (req.headers['x-internal-secret'] !== config.INTERNAL_SECRET) {
      return res.code(403).send({ error: 'Forbidden' })
    }

    const parsed = createRecurringOrderBody.safeParse(req.body)
    if (!parsed.success) {
      return res.code(400).send({ error: 'Invalid request', issues: parsed.error.issues })
    }
    const input = parsed.data

    // Idempotency
    const existing = await Order.findOne({ idempotencyKey: input.idempotencyKey }).lean()
    if (existing) {
      logger.info({ orderId: existing._id, idempotencyKey: input.idempotencyKey }, 'Duplicate recurring order suppressed')
      return res.send({ orderId: existing._id.toString(), paymentId: null, clientSecret: null })
    }

    // 1. Validate chef
    const chefResult = await validateChef(input.chefId)
    if (!chefResult.isEligible) {
      return res.code(422).send({ error: chefResult.reason ?? 'Chef not eligible' })
    }

    // 2. Validate availability
    const availability = await checkChefAvailability(input.chefId, input.deliveryDate)
    if (!availability.available) {
      return res.code(422).send({ error: availability.reason ?? 'Chef not available' })
    }

    // 3. Validate & snapshot dishes
    const dishSnapshots = await Promise.all(
      input.items.map((item) => fetchDishSnapshot(input.chefId, item.dishId)),
    )

    // 4. Build item snapshots
    const itemSnapshots = input.items.map((item, idx) => {
      const dish = dishSnapshots[idx]!
      const subtotal = Math.round(item.quantity * dish.price * 100) / 100
      return {
        dishId: dish.dishId, name: dish.name, description: dish.description,
        quantity: item.quantity, unitPrice: dish.price, currency: dish.currency,
        subtotal, dietaryTags: dish.dietaryTags, allergens: dish.allergens,
      }
    })

    // 5. Server-side pricing (no coupon on recurring orders)
    const pricing = calculatePricing({ items: itemSnapshots })

    // 6. Create order
    const order = await Order.create({
      customerId:      input.customerId,
      chefId:          input.chefId,
      deliveryDate:    input.deliveryDate,
      items:           itemSnapshots,
      deliveryAddress: input.addressSnapshot,
      pricing,
      status:          'PENDING',
      orderType:       'SUBSCRIPTION',
      subscriptionId:  input.subscriptionId,
      idempotencyKey:  input.idempotencyKey,
    })
    const orderId = order._id.toString()

    // 7. Increment capacity counter
    const redis = (fastify as any).redis as Redis
    await incrementChefOrderCount(redis, input.chefId, input.deliveryDate)

    // 8. Create payment
    const amountCents = Math.round(pricing.total * 100)
    const paymentResult = await createPaymentForOrder(
      orderId, input.customerId, amountCents, pricing.currency, input.idempotencyKey,
    )

    // 9. Publish order.created event
    await publishOrderEvent({
      type: 'order.created', orderId, userId: input.customerId, chefId: input.chefId,
      items: itemSnapshots.map((i) => ({ dishId: i.dishId, name: i.name, quantity: i.quantity, price: i.unitPrice })),
      totalAmount: pricing.total, createdAt: new Date().toISOString(), version: '1',
    })

    logger.info({ orderId, subscriptionId: input.subscriptionId }, 'Recurring order created')

    return res.code(201).send({ orderId, paymentId: paymentResult.paymentId, clientSecret: paymentResult.clientSecret })
  })
}
