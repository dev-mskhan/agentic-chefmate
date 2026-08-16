import { Kafka } from 'kafkajs'
import { createProducer, TypedProducer, ORDER_EVENTS_TOPIC, OrderEvent } from '@chefmate/event-contracts'

let producer: TypedProducer | null = null

export async function initEventService(broker: string): Promise<void> {
  const kafka = new Kafka({ clientId: 'order-service', brokers: [broker] })
  producer = createProducer(kafka)
  await producer.connect()
}

export async function disconnectEventService(): Promise<void> {
  if (producer) { await producer.disconnect(); producer = null }
}

export async function publishOrderEvent(event: OrderEvent): Promise<void> {
  if (!producer) {
    console.warn('[event.service] Producer not initialized — skipping event:', event.type)
    return
  }
  await producer.emit(ORDER_EVENTS_TOPIC, event)
}
