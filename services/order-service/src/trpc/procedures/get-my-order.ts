import { z } from 'zod'
import { protectedProcedure } from '../trpc'
import { Order } from '../../models/order.model'
import { NotFoundError, ForbiddenError } from '@chefmate/errors'

export const getMyOrderProcedure = protectedProcedure
  .input(z.object({ orderId: z.string().min(1) }))
  .query(async ({ ctx, input }) => {
    const { userId: customerId, role } = ctx.principal

    const order = await Order.findById(input.orderId).lean()
    if (!order) throw new NotFoundError('Order not found')

    // ADMIN can view any order; customer can only view their own
    if (role !== 'ADMIN' && order.customerId !== customerId) {
      throw new ForbiddenError('You can only view your own orders')
    }

    return order
  })
