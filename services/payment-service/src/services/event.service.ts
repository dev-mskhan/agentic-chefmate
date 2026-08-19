import { Kafka } from 'kafkajs'
import { createProducer, TypedProducer, PAYMENT_EVENTS_TOPIC, PaymentEvent, CONNECT_EVENTS_TOPIC, ConnectEvent } from '@chefmate/event-contracts'

let producer: TypedProducer | null = null

export async function initEventService(broker: string): Promise<void> {
  const kafka = new Kafka({ clientId: 'payment-service', brokers: [broker] })
  producer = createProducer(kafka)
  await producer.connect()
}

export async function disconnectEventService(): Promise<void> {
  if (producer) { await producer.disconnect(); producer = null }
}

export async function publishPaymentEvent(event: PaymentEvent): Promise<void> {
  if (!producer) {
    console.warn('[event.service] Producer not initialized — skipping event:', event.type)
    return
  }
  await producer.emit(PAYMENT_EVENTS_TOPIC, event)
}

export async function publishConnectEvent(event: ConnectEvent): Promise<void> {
  if (!producer) {
    console.warn('[event.service] Producer not initialized — skipping connect event:', event.type)
    return
  }
  await producer.emit(CONNECT_EVENTS_TOPIC, event)
}
