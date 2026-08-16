import { z } from 'zod'
import { protectedProcedure } from '../trpc'
import { Subscription } from '../../models/subscription.model'
import { SubscriptionPeriod } from '../../models/subscription-period.model'
import { fetchPlanSnapshot, validateChef } from '../../services/chef-client.service'
import { fetchAddressSnapshot } from '../../services/user-client.service'
import { createRecurringOrder } from '../../services/order-client.service'
import { publishSubscriptionEvent } from '../../services/event.service'
import { scheduleNextBilling } from '../../utils/scheduler'
import { computeNextPeriod, periodStartKey } from '../../utils/date.utils'
import { ValidationError } from '@chefmate/errors'
import { createLogger } from '@chefmate/logger'

const logger = createLogger('create-subscription')

const createSubscriptionInput = z.object({
  planId:         z.string().min(1),
  chefId:         z.string().min(1),
  tierId:         z.string().optional(),
  addressId:      z.string().min(1),
  frequency:      z.enum(['WEEKLY', 'BIWEEKLY', 'MONTHLY']),
  customerNote:   z.string().max(500).optional(),
  idempotencyKey: z.string().max(128).optional(),
})

export const createSubscriptionProcedure = protectedProcedure
  .input(createSubscriptionInput)
  .mutation(async ({ ctx, input }) => {
    const { userId: customerId, email: customerEmail } = ctx.principal

    // ── Idempotency ────────────────────────────────────────────────────────────
    if (input.idempotencyKey) {
      const existing = await Subscription.findOne({ idempotencyKey: input.idempotencyKey }).lean()
      if (existing) {
        logger.info({ subscriptionId: existing._id }, 'Duplicate subscription suppressed')
        return { subscription: existing, clientSecret: null, paymentId: null }
      }
    }

    // ── 1. Validate chef ───────────────────────────────────────────────────────
    const chefResult = await validateChef(input.chefId)
    if (!chefResult.isEligible) throw new ValidationError(chefResult.reason ?? 'Chef not eligible')

    // ── 2. Fetch & validate plan ───────────────────────────────────────────────
    const plan = await fetchPlanSnapshot(input.planId, input.chefId)

    // Validate frequency matches plan if plan specifies one
    if (plan.frequency && plan.frequency !== input.frequency) {
      throw new ValidationError(`Plan only supports ${plan.frequency} frequency`)
    }

    // ── 3. Resolve price from tier or base ────────────────────────────────────
    let selectedTier: typeof plan.tiers[0] | undefined
    let selectedDishIds: string[] = []

    if (input.tierId) {
      selectedTier = plan.tiers.find((t) => t._id === input.tierId)
      if (!selectedTier) throw new ValidationError(`Tier ${input.tierId} not found in plan`)
      selectedDishIds = selectedTier.dishIds
    } else if (plan.tiers.length > 0) {
      selectedTier = plan.tiers[0]!
      selectedDishIds = selectedTier.dishIds
    }

    const priceAmount = selectedTier?.priceOverride ?? plan.basePrice
    if (!priceAmount || priceAmount <= 0) throw new ValidationError('Plan has no valid price')

    const priceSnapshot = {
      amountCents: Math.round(priceAmount * 100),
      currency:    plan.currency,
    }

    // ── 4. Validate & snapshot address ────────────────────────────────────────
    const addressSnapshot = await fetchAddressSnapshot(customerId, customerEmail, input.addressId)

    // ── 5. Compute initial period dates ────────────────────────────────────────
    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)
    const initialPeriod = computeNextPeriod(today, input.frequency)
    // First delivery: one cycle from today; period starts today
    const periodStart = today
    const periodEnd   = initialPeriod.periodEnd
    const idempotencyKey = `sub_init_${customerId}_${input.planId}_${periodStartKey(today)}`

    // ── 6. Create subscription (PENDING) ──────────────────────────────────────
    const subscription = await Subscription.create({
      customerId,
      chefId:              input.chefId,
      planId:              input.planId,
      tierId:              input.tierId ?? selectedTier?._id,
      status:              'PENDING',
      frequency:           input.frequency,
      deliveryAddress:     addressSnapshot,
      selectedDishIds,
      priceSnapshot,
      introDiscountAmount: 0,
      nextBillingDate:     initialPeriod.nextBillingDate,
      nextOrderDate:       initialPeriod.nextOrderDate,
      currentPeriodStart:  periodStart,
      currentPeriodEnd:    periodEnd,
      skippedPeriods:      [],
      idempotencyKey:      input.idempotencyKey,
    })

    const subscriptionId = subscription._id.toString()

    // ── 7. Create initial recurring order via Order Service ───────────────────
    const deliveryDate = periodStartKey(initialPeriod.nextBillingDate)
    const orderResult = await createRecurringOrder({
      subscriptionId,
      customerId,
      customerEmail,
      chefId:         input.chefId,
      deliveryDate,
      items:          selectedDishIds.map((dishId) => ({ dishId, quantity: 1 })),
      addressSnapshot,
      currency:       plan.currency,
      idempotencyKey,
    })

    // ── 8. Record period ───────────────────────────────────────────────────────
    await SubscriptionPeriod.create({
      subscriptionId,
      periodStart:    periodStartKey(periodStart),
      periodEnd:      periodStartKey(periodEnd),
      orderId:        orderResult.orderId,
      paymentId:      orderResult.paymentId ?? undefined,
      status:         'PENDING',
      idempotencyKey,
    })

    // ── 9. Activate subscription ───────────────────────────────────────────────
    subscription.status = 'ACTIVE'
    await subscription.save()

    // ── 10. Schedule next billing ─────────────────────────────────────────────
    await scheduleNextBilling(subscriptionId, initialPeriod.nextBillingDate)

    // ── 11. Publish events ────────────────────────────────────────────────────
    await publishSubscriptionEvent({
      type: 'subscription.created', subscriptionId, customerId,
      planId: input.planId, chefId: input.chefId, frequency: input.frequency,
      amountCents: priceSnapshot.amountCents, currency: priceSnapshot.currency,
      createdAt: new Date().toISOString(), version: '1',
    })
    await publishSubscriptionEvent({
      type: 'subscription.activated', subscriptionId, customerId,
      planId: input.planId, chefId: input.chefId, orderId: orderResult.orderId,
      createdAt: new Date().toISOString(), version: '1',
    })

    logger.info({ subscriptionId, customerId, planId: input.planId }, 'Subscription created and activated')

    return {
      subscription: subscription.toObject(),
      paymentId:    orderResult.paymentId,
      clientSecret: orderResult.clientSecret,
    }
  })
