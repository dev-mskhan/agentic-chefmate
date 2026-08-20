import mongoose, { Schema, Document } from 'mongoose'

export const AuditActionValues = [
  'CHEF_APPROVED', 'CHEF_REJECTED', 'CHEF_SUSPENDED', 'CHEF_RESTORED',
  'USER_SUSPENDED', 'USER_RESTORED',
  'REVIEW_MODERATED', 'REFUND_REQUESTED',
] as const
export type AuditAction = typeof AuditActionValues[number]

export interface IAdminAuditLog extends Document {
  adminUserId: string
  action:      AuditAction
  targetType:  string
  targetId:    string
  reason?:     string
  metadata:    Record<string, unknown>
  traceId?:    string
  createdAt:   Date
}

const auditLogSchema = new Schema<IAdminAuditLog>(
  {
    adminUserId: { type: String, required: true },
    action:      { type: String, enum: AuditActionValues, required: true },
    targetType:  { type: String, required: true },
    targetId:    { type: String, required: true },
    reason:      { type: String },
    metadata:    { type: Schema.Types.Mixed, default: {} },
    traceId:     { type: String },
    createdAt:   { type: Date, default: () => new Date(), immutable: true },
  },
  { timestamps: false },
)

auditLogSchema.index({ adminUserId: 1, createdAt: -1 })
auditLogSchema.index({ action: 1, createdAt: -1 })
auditLogSchema.index({ targetType: 1, targetId: 1 })
auditLogSchema.index({ createdAt: -1 })

export const AdminAuditLog = mongoose.model<IAdminAuditLog>(
  'AdminAuditLog', auditLogSchema, 'adminauditlogs',
)
