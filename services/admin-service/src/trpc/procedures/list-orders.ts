import { z } from 'zod'
import { adminProcedure } from '../trpc'
import { AdminOrder }     from '../../models/order.model'
import { CursorInputSchema, buildCursorFilter, resolveNextCursor } from '../../utils/cursor-pagination'

export const listOrdersProcedure = adminProcedure
  .input(CursorInputSchema.extend({
    status:     z.string().optional(),
    chefId:     z.string().optional(),
    customerId: z.string().optional(),
    from:       z.string().datetime().optional(),
    to:         z.string().datetime().optional(),
  }))
  .query(async ({ input }) => {
    const filter: Record<string, unknown> = { ...buildCursorFilter(input.cursor) }
    if (input.status)     filter['status']     = input.status
    if (input.chefId)     filter['chefId']     = input.chefId
    if (input.customerId) filter['customerId'] = input.customerId
    if (input.from || input.to) {
      const dr: Record<string, Date> = {}
      if (input.from) dr['$gte'] = new Date(input.from)
      if (input.to)   dr['$lte'] = new Date(input.to)
      filter['createdAt'] = dr
    }
    const orders = await AdminOrder.find(filter).sort({ createdAt: -1 }).limit(input.limit).lean()
    return { orders, nextCursor: resolveNextCursor(orders as any[], input.limit) }
  })
