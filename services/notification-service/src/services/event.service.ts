import { Kafka } from 'kafkajs'
import {
  createProducer,
  TypedProducer,
  NOTIFICATION_EVENTS_TOPIC,
  NotificationEvent,
} from '@chefmate/event-contracts'

let producer: TypedProducer | null = null

export async function initNotificationEventService(broker: string): Promise<void> {
  const kafka = new Kafka({ clientId: 'notification-service-producer', brokers: [broker] })
  producer = createProducer(kafka)
  await producer.connect()
}

export async function disconnectNotificationEventService(): Promise<void> {
  if (producer) {
    await producer.disconnect()
    producer = null
  }
}

export async function publishNotificationEvent(event: NotificationEvent): Promise<void> {
  if (!producer) {
    console.warn('[notification event.service] Producer not initialized')
    return
  }
  await producer.emit(NOTIFICATION_EVENTS_TOPIC, event)
}
