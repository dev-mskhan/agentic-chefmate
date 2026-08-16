import { z } from 'zod'
import { chefProcedure } from '../trpc'
import { Order, OrderStatusValues, isValidTransition } from '../../models/order.model'
import { resolveChefIdFromUserId } from '../../services/chef-client.service'
import { NotFoundError, ForbiddenError, ValidationError } from '@chefmate/errors'
import { publishOrderEvent } from '../../services/event.service'
import { createLogger } from '@chefmate/logger'

const logger = createLogger('update-order-status')

export const updateOrderStatusProcedure = chefProcedure
  .input(z.object({
    orderId:   z.string().min(1),
    newStatus: z.enum(OrderStatusValues),
  }))
  .mutation(async ({ ctx, input }) => {
    const chefId = await resolveChefIdFromUserId(ctx.principal.userId, ctx.principal.email)

    const order = await Order.findById(input.orderId)
    if (!order) throw new NotFoundError('Order not found')
    if (order.chefId !== chefId) throw new ForbiddenError('You can only update orders for your own profile')

    const oldStatus = order.status
    if (!isValidTransition(oldStatus, input.newStatus)) {
      throw new ValidationError(`Cannot transition order from ${oldStatus} to ${input.newStatus}`)
    }

    order.status = input.newStatus
    await order.save()

    logger.info({ orderId: input.orderId, oldStatus, newStatus: input.newStatus }, 'Order status updated')

    await publishOrderEvent({
      type:      'order.status_changed',
      orderId:   input.orderId,
      userId:    order.customerId,
      oldStatus,
      newStatus: input.newStatus,
      createdAt: new Date().toISOString(),
      version:   '1',
    })

    if (input.newStatus === 'DELIVERED') {
      await publishOrderEvent({
        type:      'order.completed',
        orderId:   input.orderId,
        userId:    order.customerId,
        chefId:    order.chefId,
        createdAt: new Date().toISOString(),
        version:   '1',
      })
    }

    return order.toObject()
  })
