import { AdminAuditLog, AuditAction } from '../models/audit-log.model'

export interface CreateAuditEntryInput {
  adminUserId: string
  action:      AuditAction
  targetType:  string
  targetId:    string
  reason?:     string
  metadata?:   Record<string, unknown>
  traceId?:    string
}

export async function createAuditEntry(input: CreateAuditEntryInput): Promise<void> {
  await AdminAuditLog.create({
    adminUserId: input.adminUserId,
    action:      input.action,
    targetType:  input.targetType,
    targetId:    input.targetId,
    reason:      input.reason,
    metadata:    input.metadata ?? {},
    traceId:     input.traceId,
  })
}
