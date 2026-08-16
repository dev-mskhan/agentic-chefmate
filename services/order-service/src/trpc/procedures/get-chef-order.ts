import { z } from 'zod'
import { chefProcedure } from '../trpc'
import { Order } from '../../models/order.model'
import { resolveChefIdFromUserId } from '../../services/chef-client.service'
import { NotFoundError, ForbiddenError } from '@chefmate/errors'

export const getChefOrderProcedure = chefProcedure
  .input(z.object({ orderId: z.string().min(1) }))
  .query(async ({ ctx, input }) => {
    const chefId = await resolveChefIdFromUserId(ctx.principal.userId, ctx.principal.email)

    const order = await Order.findById(input.orderId).lean()
    if (!order) throw new NotFoundError('Order not found')
    if (order.chefId !== chefId) throw new ForbiddenError('You can only view orders for your own profile')

    return order
  })
