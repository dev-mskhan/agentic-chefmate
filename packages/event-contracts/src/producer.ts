import { Kafka, Producer } from 'kafkajs'
import { randomUUID } from 'crypto'

export interface TypedProducer {
  emit<T extends { type: string }>(topic: string, event: T): Promise<void>
  connect(): Promise<void>
  disconnect(): Promise<void>
}

/**
 * Derives the Kafka partition key from an event payload.
 *
 * Priority order (first truthy value wins):
 *   1. event.orderId      — order-scoped events and payment events for an order
 *   2. event.userId       — user-scoped events (auth, user, review as customer)
 *   3. event.aggregateId  — generic aggregate root ID (future-proofing)
 *   4. event.chefId       — chef-scoped events
 *   5. event.customerId   — customer-scoped events (payment, subscription, review)
 *   6. event.ownerId      — legacy ownership events
 *   7. event.senderId     — chat events
 *   8. event.accountId    — payment-provider account events
 *   9. event.disputeId    — payment-dispute events
 *  10. event.paymentId    — payment events without an order ID
 *  11. event.type        — fallback: no entity ID present on this event shape
 *
 * WHY: Keying by entity ID ensures all events for a given entity land on the
 * same partition, preserving causal ordering (e.g., order.created always
 * precedes order.completed for the same orderId in the same partition).
 *
 * ⚠️  DEPLOY NOTE: Changing the partition key is a breaking change for any
 * consumer that relies on partition-level ordering or assignment. This change
 * MUST be deployed in a coordinated rollout window:
 *   1. Drain all in-flight messages on each topic.
 *   2. Deploy all producers (this change) simultaneously.
 *   3. Verify consumers are reading from the new partition distribution.
 * Do NOT merge this silently into a rolling deploy.
 */
export function resolveEventKey(event: Record<string, unknown>): string {
  const key =
    (event['orderId']    as string | undefined) ??
    (event['userId']      as string | undefined) ??
    (event['aggregateId'] as string | undefined) ??
    (event['chefId']      as string | undefined) ??
    (event['customerId']  as string | undefined) ??
    (event['ownerId']     as string | undefined) ??
    (event['senderId']    as string | undefined) ??
    (event['accountId']   as string | undefined) ??
    (event['disputeId']   as string | undefined) ??
    (event['paymentId']  as string | undefined) ??
    (event['type']        as string)
  return key
}

export function createProducer(kafka: Kafka): TypedProducer {
  const producer: Producer = kafka.producer({ idempotent: true })

  return {
    async connect() {
      await producer.connect()
    },

    async disconnect() {
      await producer.disconnect()
    },

    async emit<T extends { type: string }>(topic: string, event: T): Promise<void> {
      const key = resolveEventKey(event as unknown as Record<string, unknown>)
      const eventWithId = {
        ...event,
        eventId: (event as T & { eventId?: string }).eventId ?? randomUUID(),
      }
      await producer.send({
        topic,
        messages: [
          {
            key,
            value: JSON.stringify(eventWithId),
            headers: {
              'event-type': event.type,
              'emitted-at': new Date().toISOString(),
              version: '1',
            },
          },
        ],
      })
    },
  }
}
