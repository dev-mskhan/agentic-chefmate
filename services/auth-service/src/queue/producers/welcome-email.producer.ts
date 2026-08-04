import type { Logger } from "@platform/logger";
import { QUEUE_NAMES } from "@platform/shared-types";
import type { WelcomeEmailJobPayload } from "../../services/user.service.js";
import { AUTH_EXCHANGE, type RabbitMqClient } from "../rabbitmq.client.js";

export interface WelcomeEmailProducer {
  publish(payload: WelcomeEmailJobPayload): Promise<void>;
}

/**
 * Confirm-channel publishing (§4.7): if the broker nacks or the channel can't
 * flush, waitForConfirms() throws and we log it — a dropped job is never
 * silent.
 */
export function createWelcomeEmailProducer(
  client: RabbitMqClient,
  logger: Logger,
): WelcomeEmailProducer {
  return {
    async publish(payload) {
      const message = Buffer.from(JSON.stringify(payload));
      try {
        client.publishChannel.publish(AUTH_EXCHANGE, QUEUE_NAMES.AUTH_WELCOME_EMAIL, message, {
          persistent: true,
          contentType: "application/json",
        });
        await client.publishChannel.waitForConfirms();
      } catch (err) {
        logger.error({ err, payload }, "Welcome-email publish was not confirmed");
        throw err;
      }
    },
  };
}
