import amqplib, { type Channel, type ConfirmChannel, type ChannelModel } from "amqplib";
import type { Logger } from "@platform/logger";
import { QUEUE_NAMES } from "@platform/shared-types";

export const AUTH_EXCHANGE = "auth.events";
export const AUTH_DLX = "auth.events.dlx";
export const AUTH_DLQ = "auth.events.dlq";

export interface RabbitMqClient {
  connection: ChannelModel;
  /** Confirm channel for publishing — publish failures surface in logs. */
  publishChannel: ConfirmChannel;
  /** Separate channel for consumers so a slow consumer never blocks publishers. */
  consumerChannel: Channel;
  close(): Promise<void>;
}

/**
 * One durable topic exchange `auth.events`. Each durable queue is bound with
 * its own routing key (= queue name). Dead-lettering is real, not documented:
 * every queue declares `deadLetterExchange: AUTH_DLX`, so a message nacked
 * with requeue=false after the retry budget is exhausted lands on the durable
 * DLQ.
 */
export async function connectRabbitMq(url: string, logger: Logger): Promise<RabbitMqClient> {
  const connection = await amqplib.connect(url);
  connection.on("error", (err) => logger.error({ err }, "RabbitMQ connection error"));
  connection.on("close", () => logger.warn("RabbitMQ connection closed"));

  const publishChannel = await connection.createConfirmChannel();
  const consumerChannel = await connection.createChannel();

  await publishChannel.assertExchange(AUTH_EXCHANGE, "topic", { durable: true });
  await publishChannel.assertExchange(AUTH_DLX, "topic", { durable: true });
  await publishChannel.assertQueue(AUTH_DLQ, { durable: true });

  const queueNames = [QUEUE_NAMES.AUTH_WELCOME_EMAIL, QUEUE_NAMES.AUTH_AUDIT_LOG];
  for (const queueName of queueNames) {
    await publishChannel.assertQueue(queueName, {
      durable: true,
      deadLetterExchange: AUTH_DLX,
    });
    await publishChannel.bindQueue(queueName, AUTH_EXCHANGE, queueName);
  }

  return {
    connection,
    publishChannel,
    consumerChannel,
    async close() {
      try {
        await publishChannel.close();
      } catch {
        /* already closed */
      }
      try {
        await consumerChannel.close();
      } catch {
        /* already closed */
      }
      try {
        await connection.close();
      } catch {
        /* already closed */
      }
    },
  };
}
