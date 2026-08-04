import type { Logger } from "@platform/logger";
import { getAuditLogModel, type AuthAuditEventType } from "../models/index.js";

export interface AuditLogEntry {
  userId: string;
  eventType: AuthAuditEventType;
  ip?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
  createdAt?: Date;
}

export interface AuditService {
  persistAuditLog(entry: AuditLogEntry): Promise<void>;
}

/**
 * Persists an AuditLog document. Called by the AUTH_AUDIT_LOG consumer, not
 * from the HTTP/tRPC request path — decoupling audit writes from the
 * request/response cycle. Errors propagate so the consumer can retry/DLQ.
 */
export function createAuditService(logger: Logger): AuditService {
  return {
    async persistAuditLog(entry) {
      try {
        await getAuditLogModel().create({
          userId: entry.userId,
          eventType: entry.eventType,
          ip: entry.ip,
          userAgent: entry.userAgent,
          metadata: entry.metadata,
          createdAt: entry.createdAt ?? new Date(),
        });
      } catch (err) {
        logger.error({ err, entry }, "Failed to persist audit log entry");
        throw err;
      }
    },
  };
}
