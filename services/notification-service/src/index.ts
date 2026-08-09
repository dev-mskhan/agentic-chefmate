import { loadEnv } from '@chefmate/config'
loadEnv(__dirname)

import { Kafka } from 'kafkajs'
import Redis from 'ioredis'
import { connectMongo, disconnectMongo } from '@chefmate/db'
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
import { attachWorkerLifecycle } from './workers/lifecycle'
import { initNotificationEventService, disconnectNotificationEventService } from './services/event.service'
import { initWebPush } from './services/web-push.service'

const logger = createLogger('notification-service')

async function start() {
  // ── MongoDB ──────────────────────────────────────────────────────────────
  await connectMongo(config.MONGODB_URI)
  logger.info('MongoDB connected')

  // ── Web Push ─────────────────────────────────────────────────────────────
  initWebPush()

  // ── Kafka producer (for notification.sent / notification.failed events) ──
  await initNotificationEventService(config.REDPANDA_BROKER!)
  logger.info('Notification event producer connected')

  // ── BullMQ queue (no ioredis instance — plain connection config) ─────────
  const queue = getNotificationQueue()

  // ── BullMQ workers ────────────────────────────────────────────────────────
  // pubClient is an ioredis instance used only for Redis pub/sub in the
  // inapp worker. It is NOT passed to BullMQ Queue/Worker constructors.
  const pubClient = new Redis(config.REDIS_URL!, { maxRetriesPerRequest: null })

  const emailWorker = startEmailWorker()
  const pushWorker  = startPushWorker()
  const inappWorker = startInAppWorker(pubClient)

  // Attach lifecycle listeners — publish notification.sent / notification.failed
  attachWorkerLifecycle(emailWorker)
  attachWorkerLifecycle(pushWorker)
  attachWorkerLifecycle(inappWorker)

  logger.info('BullMQ workers started')

  // ── Kafka consumers (one per topic/group for isolation) ──────────────────
  const kafka = new Kafka({ clientId: 'notification-service', brokers: [config.REDPANDA_BROKER!] })

  const authConsumer  = createConsumer(kafka, 'notification-service-auth')
  const orderConsumer = createConsumer(kafka, 'notification-service-order')
  const chefConsumer  = createConsumer(kafka, 'notification-service-chef')
  const chatConsumer  = createConsumer(kafka, 'notification-service-chat')

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

  logger.info(`notification-service started (port ${config.PORT})`)

  // ── Graceful shutdown ─────────────────────────────────────────────────────
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
      pubClient.quit(),
      disconnectNotificationEventService(),
    ])
    await disconnectMongo()
    process.exit(0)
  }

  process.once('SIGINT', () => void shutdown('SIGINT'))
  process.once('SIGTERM', () => void shutdown('SIGTERM'))
}

void start().catch((err) => {
  console.error('Failed to start notification-service', err)
  process.exit(1)
})
