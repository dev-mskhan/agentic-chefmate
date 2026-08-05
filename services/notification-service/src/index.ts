import { Kafka } from 'kafkajs'
import Redis from 'ioredis'
import { createLogger } from '@chefmate/logger'
import { config } from './config'
import {
  createConsumer,
  AUTH_EVENTS_TOPIC,
  ORDER_EVENTS_TOPIC,
  CHEF_EVENTS_TOPIC,
  CHAT_EVENTS_TOPIC,
} from '@chefmate/event-contracts'
import type { AuthEvent, OrderEvent, ChefEvent, ChatEvent } from '@chefmate/event-contracts'
import { getNotificationQueue } from './queues/notification.queue'
import { handleAuthEvent } from './consumers/auth.consumer'
import { handleOrderEvent } from './consumers/order.consumer'
import { handleChefEvent } from './consumers/chef.consumer'
import { handleChatEvent } from './consumers/chat.consumer'
import { startEmailWorker } from './workers/email.worker'
import { startPushWorker } from './workers/push.worker'
import { startInAppWorker } from './workers/inapp.worker'

const logger = createLogger('notification-service')

async function start() {
  // Redis connections
  const redis = new Redis(config.REDIS_URL, { maxRetriesPerRequest: null })
  const pubRedis = new Redis(config.REDIS_URL, { maxRetriesPerRequest: null })

  // Notification queue
  const queue = getNotificationQueue(redis)

  // BullMQ workers
  const emailWorker = startEmailWorker(redis)
  const pushWorker = startPushWorker(redis)
  const inappWorker = startInAppWorker(redis, pubRedis)

  logger.info('BullMQ workers started')

  // Kafka consumers — one per topic/group for isolation
  const kafka = new Kafka({ clientId: 'notification-service', brokers: [config.REDPANDA_BROKER] })

  const authConsumer = createConsumer(kafka, 'notification-service-auth')
  const orderConsumer = createConsumer(kafka, 'notification-service-order')
  const chefConsumer = createConsumer(kafka, 'notification-service-chef')
  const chatConsumer = createConsumer(kafka, 'notification-service-chat')

  await Promise.all([
    authConsumer.connect(),
    orderConsumer.connect(),
    chefConsumer.connect(),
    chatConsumer.connect(),
  ])

  await authConsumer.subscribe<AuthEvent>(AUTH_EVENTS_TOPIC, (e) => handleAuthEvent(e, queue))
  await orderConsumer.subscribe<OrderEvent>(ORDER_EVENTS_TOPIC, (e) => handleOrderEvent(e, queue))
  await chefConsumer.subscribe<ChefEvent>(CHEF_EVENTS_TOPIC, (e) => handleChefEvent(e, queue))
  await chatConsumer.subscribe<ChatEvent>(CHAT_EVENTS_TOPIC, (e) => handleChatEvent(e, queue))

  logger.info(`notification-service started on port ${config.PORT}`)

  const shutdown = async (signal: string) => {
    logger.info(`${signal} — shutting down notification-service`)
    await Promise.all([
      authConsumer.disconnect(),
      orderConsumer.disconnect(),
      chefConsumer.disconnect(),
      chatConsumer.disconnect(),
      emailWorker.close(),
      pushWorker.close(),
      inappWorker.close(),
      redis.quit(),
      pubRedis.quit(),
    ])
    process.exit(0)
  }

  process.once('SIGINT', () => void shutdown('SIGINT'))
  process.once('SIGTERM', () => void shutdown('SIGTERM'))
}

void start().catch((err) => {
  console.error('Failed to start notification-service', err)
  process.exit(1)
})
