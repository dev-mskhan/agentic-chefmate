import { Kafka, Producer } from 'kafkajs'
import { createLogger } from '@chefmate/logger'
import { CHAT_EVENTS_TOPIC } from '@chefmate/event-contracts'
import type { ChatEvent } from '@chefmate/event-contracts'

const logger = createLogger('chat-service:events')
let producer: Producer | null = null

export async function initEventService(broker: string): Promise<void> {
  const kafka = new Kafka({ clientId: 'chat-service', brokers: [broker] })
  producer = kafka.producer()
  await producer.connect()
}

export async function disconnectEventService(): Promise<void> {
  if (producer) {
    await producer.disconnect()
    producer = null
  }
}

export async function publishChatEvent(event: ChatEvent): Promise<void> {
  if (!producer) {
    logger.warn({ type: event.type }, 'Kafka producer not initialized — skipping event')
    return
  }
  try {
    await producer.send({
      topic:    CHAT_EVENTS_TOPIC,
      messages: [{ key: event.messageId, value: JSON.stringify(event) }],
    })
  } catch (err) {
    // Fire-and-forget: log but never interrupt the socket event flow
    logger.error({ err, eventType: event.type }, 'Failed to publish chat event to Kafka')
  }
}
