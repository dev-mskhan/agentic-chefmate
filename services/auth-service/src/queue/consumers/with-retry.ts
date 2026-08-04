import type { Channel, ConsumeMessage } from "amqplib";
import type { Logger } from "@platform/logger";
import { AUTH_EXCHANGE } from "../rabbitmq.client.js";

export const MAX_ATTEMPTS = 3;

/**
 * Bounded-retry consumer wrapper. On success the message is acked. On failure
 * it is re-published with an incremented `x-attempts` header (and acked) up to
 * MAX_ATTEMPTS; once exhausted the original is nacked without requeue so it
 * dead-letters to AUTH_DLQ.
 */
export async function withRetry(
  channel: Channel,
  msg: ConsumeMessage,
  routingKey: string,
  handler: (parsed: unknown) => Promise<void>,
  logger: Logger,
): Promise<void> {
  const headers = msg.properties.headers ?? {};
  const attempts = Number(headers["x-attempts"] ?? 0) + 1;

  try {
    const parsed = JSON.parse(msg.content.toString("utf8"));
    await handler(parsed);
    channel.ack(msg);
  } catch (err) {
    logger.warn({ err, routingKey, attempts }, "Consumer handler failed");
    if (attempts >= MAX_ATTEMPTS) {
      logger.error({ routingKey }, "Message failed after retries; dead-lettering");
      channel.nack(msg, false, false);
    } else {
      const ok = channel.publish(AUTH_EXCHANGE, routingKey, msg.content, {
        contentType: msg.properties.contentType,
        headers: { ...headers, "x-attempts": attempts },
        persistent: true,
      });
      if (!ok) {
        logger.warn({ routingKey }, "Channel buffer full while re-publishing for retry");
      }
      channel.ack(msg);
    }
  }
}
