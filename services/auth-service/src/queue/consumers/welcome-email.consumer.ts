import type { Logger } from "@platform/logger";
import { QUEUE_NAMES } from "@platform/shared-types";
import type { EmailService } from "../../services/email.service.js";
import type { WelcomeEmailJobPayload } from "../../services/user.service.js";
import type { RabbitMqClient } from "../rabbitmq.client.js";
import { withRetry } from "./with-retry.js";

export function startWelcomeEmailConsumer(
  client: RabbitMqClient,
  deps: { emailService: EmailService; logger: Logger },
): Promise<void> {
  const { emailService, logger } = deps;
  return client.consumerChannel
    .consume(QUEUE_NAMES.AUTH_WELCOME_EMAIL, (msg) => {
      if (!msg) return;
      void withRetry(
        client.consumerChannel,
        msg,
        QUEUE_NAMES.AUTH_WELCOME_EMAIL,
        async (parsed) => {
          await emailService.sendWelcomeEmail(parsed as WelcomeEmailJobPayload);
        },
        logger,
      );
    })
    .then(() => {
      logger.info({ queue: QUEUE_NAMES.AUTH_WELCOME_EMAIL }, "Welcome-email consumer started");
    });
}
