import { z } from 'zod'
import { protectedProcedure } from '../trpc'
import { Order, OrderStatusValues } from '../../models/order.model'

export const listMyOrdersProcedure = protectedProcedure
  .input(z.object({
    status: z.enum(OrderStatusValues).optional(),
    limit:  z.number().int().min(1).max(100).default(20),
    offset: z.number().int().min(0).default(0),
  }))
  .query(async ({ ctx, input }) => {
    const { userId: customerId } = ctx.principal

    const filter: Record<string, unknown> = { customerId }
    if (input.status) filter['status'] = input.status

    const [orders, total] = await Promise.all([
      Order.find(filter).sort({ createdAt: -1 }).skip(input.offset).limit(input.limit).lean(),
      Order.countDocuments(filter),
    ])

    return { orders, total, limit: input.limit, offset: input.offset }
  })
