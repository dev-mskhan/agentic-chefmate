import type { Redis } from "ioredis";
import type { Logger } from "@platform/logger";
import { PUBSUB_CHANNELS } from "@platform/shared-types";

export type AuthEventType = "login" | "logout" | "session.revoked";

export interface AuthEvent {
  type: AuthEventType;
  userId: string;
  sessionId: string;
  timestamp: number;
}

export interface PubSubService {
  publish(event: AuthEvent): Promise<void>;
}

/**
 * Fire-and-forget real-time notifications on PUBSUB_CHANNELS.AUTH_EVENTS.
 * Nothing subscribes yet (notification-service doesn't exist) — this is
 * future-proofing, distinct from RabbitMQ durable jobs (different concern).
 */
export function createPubsubService(redis: Redis, logger: Logger): PubSubService {
  return {
    async publish(event) {
      try {
        await redis.publish(PUBSUB_CHANNELS.AUTH_EVENTS, JSON.stringify(event));
      } catch (err) {
        logger.warn({ err, event }, "Failed to publish auth event");
      }
    },
  };
}
