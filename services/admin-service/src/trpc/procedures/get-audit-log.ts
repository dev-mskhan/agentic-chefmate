import { z } from 'zod'
import { TRPCError }       from '@trpc/server'
import { adminProcedure }  from '../trpc'
import { AdminAuditLog }   from '../../models/audit-log.model'

export const getAuditLogProcedure = adminProcedure
  .input(z.object({ logId: z.string().min(1) }))
  .query(async ({ input }) => {
    const log = await AdminAuditLog.findById(input.logId).lean()
    if (!log) throw new TRPCError({ code: 'NOT_FOUND', message: 'Audit log entry not found' })
    return log
  })
