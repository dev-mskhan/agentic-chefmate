import { Kafka, Producer } from 'kafkajs'

export interface TypedProducer {
  emit<T extends { type: string }>(topic: string, event: T): Promise<void>
  connect(): Promise<void>
  disconnect(): Promise<void>
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
      await producer.send({
        topic,
        messages: [
          {
            key: event.type,
            value: JSON.stringify(event),
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
