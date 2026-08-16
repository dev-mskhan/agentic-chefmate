import { z } from 'zod'
import { chefProcedure } from '../trpc'
import { Order, OrderStatusValues } from '../../models/order.model'
import { resolveChefIdFromUserId } from '../../services/chef-client.service'

export const listChefOrdersProcedure = chefProcedure
  .input(z.object({
    status:       z.enum(OrderStatusValues).optional(),
    deliveryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    limit:        z.number().int().min(1).max(100).default(20),
    offset:       z.number().int().min(0).default(0),
  }).optional().default({}))
  .query(async ({ ctx, input }) => {
    const chefId = await resolveChefIdFromUserId(ctx.principal.userId, ctx.principal.email)

    const filter: Record<string, unknown> = { chefId }
    if (input.status)       filter['status']       = input.status
    if (input.deliveryDate) filter['deliveryDate'] = input.deliveryDate

    const [orders, total] = await Promise.all([
      Order.find(filter).sort({ createdAt: -1 }).skip(input.offset).limit(input.limit).lean(),
      Order.countDocuments(filter),
    ])

    return { orders, total, limit: input.limit, offset: input.offset }
  })
