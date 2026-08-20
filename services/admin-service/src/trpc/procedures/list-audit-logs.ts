import { adminProcedure }        from '../trpc'
import { AdminAuditLog, AuditActionValues } from '../../models/audit-log.model'
import { z } from 'zod'
import { CursorInputSchema, buildCursorFilter, resolveNextCursor } from '../../utils/cursor-pagination'

export const listAuditLogsProcedure = adminProcedure
  .input(CursorInputSchema.extend({
    action:      z.enum(AuditActionValues).optional(),
    targetType:  z.string().optional(),
    adminUserId: z.string().optional(),
  }))
  .query(async ({ input }) => {
    const filter: Record<string, unknown> = { ...buildCursorFilter(input.cursor) }
    if (input.action)      filter['action']      = input.action
    if (input.targetType)  filter['targetType']  = input.targetType
    if (input.adminUserId) filter['adminUserId'] = input.adminUserId

    const logs = await AdminAuditLog.find(filter).sort({ createdAt: -1 }).limit(input.limit).lean()
    return { logs, nextCursor: resolveNextCursor(logs as any[], input.limit) }
  })
