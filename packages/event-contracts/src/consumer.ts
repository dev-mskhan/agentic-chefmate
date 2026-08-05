import { Kafka, Consumer, EachMessagePayload } from 'kafkajs'

export interface TypedConsumer {
  subscribe<T>(topic: string, handler: (event: T) => Promise<void>): Promise<void>
  connect(): Promise<void>
  disconnect(): Promise<void>
}

export function createConsumer(kafka: Kafka, groupId: string): TypedConsumer {
  const consumer: Consumer = kafka.consumer({ groupId })
  // DLQ producer — sends failed messages to {topic}.dlq
  const dlqProducer = kafka.producer()

  async function sendToDLQ(
    topic: string,
    payload: EachMessagePayload,
    error: unknown,
  ): Promise<void> {
    try {
      await dlqProducer.send({
        topic: `${topic}.dlq`,
        messages: [
          {
            key: payload.message.key,
            value: payload.message.value,
            headers: {
              ...payload.message.headers,
              'dlq-error': error instanceof Error ? error.message : String(error),
              'dlq-original-topic': topic,
              'dlq-failed-at': new Date().toISOString(),
            },
          },
        ],
      })
    } catch (dlqErr) {
      console.error('[event-contracts] Failed to send to DLQ:', dlqErr)
    }
  }

  return {
    async connect() {
      await consumer.connect()
      await dlqProducer.connect()
    },

    async disconnect() {
      await consumer.disconnect()
      await dlqProducer.disconnect()
    },

    async subscribe<T>(
      topic: string,
      handler: (event: T) => Promise<void>,
    ): Promise<void> {
      await consumer.subscribe({ topic, fromBeginning: false })
      await consumer.run({
        eachMessage: async (payload: EachMessagePayload) => {
          if (!payload.message.value) return
          try {
            const event = JSON.parse(payload.message.value.toString()) as T
            await handler(event)
          } catch (err) {
            console.error(`[event-contracts] Handler failed for topic ${topic}:`, err)
            await sendToDLQ(topic, payload, err)
          }
        },
      })
    },
  }
}
