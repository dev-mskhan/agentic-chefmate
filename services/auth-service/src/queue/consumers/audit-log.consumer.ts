import type { Logger } from "@platform/logger";
import { QUEUE_NAMES } from "@platform/shared-types";
import type { AuditService } from "../../services/audit.service.js";
import type { AuditLogJobPayload } from "../producers/audit-log.producer.js";
import type { RabbitMqClient } from "../rabbitmq.client.js";
import { withRetry } from "./with-retry.js";

export function startAuditLogConsumer(
  client: RabbitMqClient,
  deps: { auditService: AuditService; logger: Logger },
): Promise<void> {
  const { auditService, logger } = deps;
  return client.consumerChannel
    .consume(QUEUE_NAMES.AUTH_AUDIT_LOG, (msg) => {
      if (!msg) return;
      void withRetry(
        client.consumerChannel,
        msg,
        QUEUE_NAMES.AUTH_AUDIT_LOG,
        async (parsed) => {
          const payload = parsed as AuditLogJobPayload;
          await auditService.persistAuditLog({
            userId: payload.userId,
            eventType: payload.eventType,
            ip: payload.ip,
            userAgent: payload.userAgent,
            metadata: payload.metadata,
            createdAt: new Date(payload.timestamp),
          });
        },
        logger,
      );
    })
    .then(() => {
      logger.info({ queue: QUEUE_NAMES.AUTH_AUDIT_LOG }, "Audit-log consumer started");
    });
}
