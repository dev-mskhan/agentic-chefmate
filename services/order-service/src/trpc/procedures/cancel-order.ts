import { z } from 'zod'
import { protectedProcedure } from '../trpc'
import { Order, CancellationReasonValues, isValidTransition } from '../../models/order.model'
import { resolveChefIdFromUserId } from '../../services/chef-client.service'
import { NotFoundError, ForbiddenError, ValidationError } from '@chefmate/errors'
import { decrementChefOrderCount } from '../../services/capacity.service'
import { publishOrderEvent } from '../../services/event.service'
import { createLogger } from '@chefmate/logger'

const logger = createLogger('cancel-order')

const cancelOrderInput = z.object({
  orderId: z.string().min(1),
  reason:  z.enum(CancellationReasonValues).default('OTHER'),
  note:    z.string().max(500).optional(),
})

export const cancelOrderProcedure = protectedProcedure
  .input(cancelOrderInput)
  .mutation(async ({ ctx, input }) => {
    const { userId, role, email } = ctx.principal

    const order = await Order.findById(input.orderId)
    if (!order) throw new NotFoundError('Order not found')

    // ── Authorization ─────────────────────────────────────────────────────────
    let cancelledBy: 'CUSTOMER' | 'CHEF' | 'ADMIN'

    if (role === 'ADMIN') {
      cancelledBy = 'ADMIN'
    } else if (role === 'CHEF') {
      // Chef can only cancel their own orders — resolve chefId via HTTP, no direct DB access
      const chefId = await resolveChefIdFromUserId(userId, email)
      if (chefId !== order.chefId) {
        throw new ForbiddenError('You can only cancel orders for your own chef profile')
      }
      cancelledBy = 'CHEF'
    } else {
      // Customer can only cancel their own orders
      if (order.customerId !== userId) {
        throw new ForbiddenError('You can only cancel your own orders')
      }
      cancelledBy = 'CUSTOMER'
    }

    // ── State machine check ───────────────────────────────────────────────────
    if (!isValidTransition(order.status, 'CANCELLED')) {
      throw new ValidationError(`Cannot cancel an order in ${order.status} status`)
    }

    // ── Update ────────────────────────────────────────────────────────────────
    const oldStatus = order.status
    order.status = 'CANCELLED'
    order.cancellation = {
      reason:      input.reason,
      note:        input.note,
      cancelledBy,
      cancelledAt: new Date(),
    }
    await order.save()

    // ── Release capacity ──────────────────────────────────────────────────────
    await decrementChefOrderCount(ctx.redis, order.chefId, order.deliveryDate)

    logger.info({ orderId: input.orderId, cancelledBy, reason: input.reason }, 'Order cancelled')

    // ── Publish events ────────────────────────────────────────────────────────
    await publishOrderEvent({
      type:      'order.status_changed',
      orderId:   input.orderId,
      userId:    order.customerId,
      oldStatus,
      newStatus: 'CANCELLED',
      createdAt: new Date().toISOString(),
      version:   '1',
    })

    await publishOrderEvent({
      type:      'order.cancelled',
      orderId:   input.orderId,
      userId:    order.customerId,
      chefId:    order.chefId,
      reason:    input.note ?? input.reason,
      createdAt: new Date().toISOString(),
      version:   '1',
    })

    return order.toObject()
  })
