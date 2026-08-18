import type { FastifyInstance } from 'fastify'
import mongoose from 'mongoose'

let kafkaConsumerRunning = false

export function setKafkaConsumerRunning(running: boolean): void {
  kafkaConsumerRunning = running
}

export async function healthRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/health', async (_req, reply) => {
    const mongoReady = mongoose.connection.readyState === 1
    const kafkaReady = kafkaConsumerRunning

    const status = mongoReady && kafkaReady ? 'ok' : 'degraded'
    const statusCode = mongoReady && kafkaReady ? 200 : 503

    return reply.code(statusCode).send({
      status,
      mongo: mongoReady ? 'connected' : 'disconnected',
      kafka: kafkaReady ? 'connected' : 'disconnected',
    })
  })
}
