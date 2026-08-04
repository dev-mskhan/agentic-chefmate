import type { Connection, Model } from "mongoose";
import { Schema } from "mongoose";
import type { BaseDocument } from "@platform/shared-types";

export type AuthAuditEventType = "login" | "logout" | "refresh" | "session.revoked";

export interface AuditLogDoc extends BaseDocument {
  userId: string;
  eventType: AuthAuditEventType;
  ip?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

const auditLogSchema = new Schema<AuditLogDoc>(
  {
    userId: { type: String, required: true, index: true },
    eventType: { type: String, required: true },
    ip: { type: String },
    userAgent: { type: String },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true },
);

auditLogSchema.index({ userId: 1, createdAt: -1 });

export function createAuditLogModel(connection: Connection): Model<AuditLogDoc> {
  return connection.model<AuditLogDoc>("AuditLog", auditLogSchema);
}
