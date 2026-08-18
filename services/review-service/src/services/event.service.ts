import { Kafka } from 'kafkajs'
import { createProducer, TypedProducer, REVIEW_EVENTS_TOPIC, ReviewEvent } from '@chefmate/event-contracts'

let producer: TypedProducer | null = null

export async function initEventService(broker: string): Promise<void> {
  const kafka = new Kafka({ clientId: 'review-service', brokers: [broker] })
  producer = createProducer(kafka)
  await producer.connect()
}

export async function disconnectEventService(): Promise<void> {
  if (producer) {
    await producer.disconnect()
    producer = null
  }
}

export async function publishReviewEvent(event: ReviewEvent): Promise<void> {
  if (!producer) {
    console.warn('[event.service] Producer not initialized — skipping event:', event.type)
    return
  }
  await producer.emit(REVIEW_EVENTS_TOPIC, event)
}
