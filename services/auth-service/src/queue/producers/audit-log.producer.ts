import type { Logger } from "@platform/logger";
import { QUEUE_NAMES } from "@platform/shared-types";
import type { AuthAuditEventType } from "../../models/index.js";
import { AUTH_EXCHANGE, type RabbitMqClient } from "../rabbitmq.client.js";

export interface AuditLogJobPayload {
  userId: string;
  eventType: AuthAuditEventType;
  ip?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
  timestamp: number;
}

export interface AuditLogProducer {
  publish(payload: AuditLogJobPayload): Promise<void>;
}

/**
 * Confirm-channel publishing (§4.7) — the handler returns immediately after
 * publishing; the Mongo write happens in the AUTH_AUDIT_LOG consumer.
 */
export function createAuditLogProducer(
  client: RabbitMqClient,
  logger: Logger,
): AuditLogProducer {
  return {
    async publish(payload) {
      const message = Buffer.from(JSON.stringify(payload));
      try {
        client.publishChannel.publish(AUTH_EXCHANGE, QUEUE_NAMES.AUTH_AUDIT_LOG, message, {
          persistent: true,
          contentType: "application/json",
        });
        await client.publishChannel.waitForConfirms();
      } catch (err) {
        logger.error({ err, payload }, "Audit-log publish was not confirmed");
        throw err;
      }
    },
  };
}
