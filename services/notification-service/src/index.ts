import { loadEnv } from '@chefmate/config'
loadEnv(__dirname)

import Fastify from 'fastify'
import { Kafka } from 'kafkajs'
import { config } from './config'
import Redis from 'ioredis'
import { connectMongo, disconnectMongo } from '@chefmate/db'
import { createLogger } from '@chefmate/logger'
import {
  createConsumer,
  AUTH_EVENTS_TOPIC,
  ORDER_EVENTS_TOPIC,
  CHEF_EVENTS_TOPIC,
  CHAT_EVENTS_TOPIC,
  NOTIFICATION_EVENTS_TOPIC,
  PAYMENT_EVENTS_TOPIC,
  SUBSCRIPTION_EVENTS_TOPIC,
} from '@chefmate/event-contracts'
import type { AuthEvent, OrderEvent, ChefEvent, ChatEvent, NotificationEvent, PaymentEvent, SubscriptionEvent } from '@chefmate/event-contracts'
import { closeAllQueues } from './queues/notification.queue'
import { handleAuthEvent } from './consumers/auth.consumer'
import { handleOrderEvent } from './consumers/order.consumer'
import { handleChefEvent } from './consumers/chef.consumer'
import { handleChatEvent } from './consumers/chat.consumer'
import { handleNotificationFailedEvent } from './consumers/notification-failure.consumer'
import { handlePaymentEvent } from './consumers/payment.consumer'
import { handleSubscriptionEvent } from './consumers/subscription.consumer'
import { startEmailWorker } from './workers/email.worker'
import { startPushWorker } from './workers/push.worker'
import { startInAppWorker } from './workers/inapp.worker'
import { attachWorkerLifecycle } from './workers/lifecycle'
import { initNotificationEventService, disconnectNotificationEventService } from './services/event.service'
import { initWebPush } from './services/web-push.service'
import { notificationRoutes } from './routes/v1/notification.routes'
import { startNotificationPresence } from './services/presence.service'

const logger = createLogger('notification-service').child({ instanceId: config.INSTANCE_ID })

async function start() {
  // ── MongoDB ──────────────────────────────────────────────────────────────
  await connectMongo(config.MONGODB_URI)
  logger.info('MongoDB connected')

  // ── Web Push ─────────────────────────────────────────────────────────────
  initWebPush()

  // ── Kafka producer (for notification.sent / notification.failed events) ──
  await initNotificationEventService(config.REDPANDA_BROKER!)
  logger.info('Notification event producer connected')

  // ── Redis pub/sub client for the in-app worker ────────────────────────────
  const pubClient = new Redis(config.REDIS_URL!, { maxRetriesPerRequest: null })
  const stopPresence = startNotificationPresence(pubClient, config.INSTANCE_ID!)

  // ── BullMQ workers (per-channel queues) ───────────────────────────────────
  const emailWorker = startEmailWorker()
  const pushWorker  = startPushWorker()
  const inappWorker = startInAppWorker(pubClient)

  attachWorkerLifecycle(emailWorker, 'email')
  attachWorkerLifecycle(pushWorker,  'push')
  attachWorkerLifecycle(inappWorker, 'inapp')

  logger.info('BullMQ workers started (notifications-email / notifications-push / notifications-inapp)')

  // ── Kafka consumers (one per topic/group for isolation) ──────────────────
  const kafka = new Kafka({ clientId: 'notification-service', brokers: [config.REDPANDA_BROKER!] })

  const authConsumer    = createConsumer(kafka, 'notification-service-auth')
  const orderConsumer   = createConsumer(kafka, 'notification-service-order')
  const chefConsumer    = createConsumer(kafka, 'notification-service-chef')
  const chatConsumer    = createConsumer(kafka, 'notification-service-chat')
  const failureConsumer = createConsumer(kafka, 'notification-service-failures')
  const paymentConsumer = createConsumer(kafka, 'notification-service-payments')
  const subscriptionConsumer = createConsumer(kafka, 'notification-service-subscriptions')

  await Promise.all([
    authConsumer.connect(),
    orderConsumer.connect(),
    chefConsumer.connect(),
    chatConsumer.connect(),
    failureConsumer.connect(),
    paymentConsumer.connect(),
    subscriptionConsumer.connect(),
  ])

  await authConsumer.subscribe<AuthEvent>(AUTH_EVENTS_TOPIC, (e) => handleAuthEvent(e))
  await orderConsumer.subscribe<OrderEvent>(ORDER_EVENTS_TOPIC, (e) => handleOrderEvent(e))
  await chefConsumer.subscribe<ChefEvent>(CHEF_EVENTS_TOPIC, (e) => handleChefEvent(e))
  await chatConsumer.subscribe<ChatEvent>(CHAT_EVENTS_TOPIC, (e) => handleChatEvent(e))
  await failureConsumer.subscribe<NotificationEvent>(
    NOTIFICATION_EVENTS_TOPIC,
    (e) => handleNotificationFailedEvent(e),
  )
  await paymentConsumer.subscribe<PaymentEvent>(PAYMENT_EVENTS_TOPIC, (e) => handlePaymentEvent(e))
  await subscriptionConsumer.subscribe<SubscriptionEvent>(SUBSCRIPTION_EVENTS_TOPIC, (e) => handleSubscriptionEvent(e))

  logger.info('All 7 Kafka consumers connected and listening')

  // ── Fastify HTTP Server ──────────────────────────────────────────────────
  const server = Fastify({ logger: false, trustProxy: true })

  await server.register(notificationRoutes, { prefix: '/api/v1/notifications' })

  // Health route at root level
  server.get('/health', async (_req, res) => {
    return res.code(200).send({ status: 'ok', service: 'notification-service' })
  })

  await server.listen({ port: config.PORT, host: '0.0.0.0' })
  logger.info(`notification-service started — HTTP on port ${config.PORT}`)

  // ── Graceful shutdown ─────────────────────────────────────────────────────
  const shutdown = async (signal: string) => {
    logger.info(`${signal} — shutting down notification-service`)
    try { await server.close() } catch {}
    await Promise.all([
      authConsumer.disconnect(),
      orderConsumer.disconnect(),
      chefConsumer.disconnect(),
      chatConsumer.disconnect(),
      failureConsumer.disconnect(),
      paymentConsumer.disconnect(),
      subscriptionConsumer.disconnect(),
      emailWorker.close(),
      pushWorker.close(),
      inappWorker.close(),
      pubClient.quit(),
      stopPresence(),
      disconnectNotificationEventService(),
      closeAllQueues(),
    ])
    await disconnectMongo()
    process.exit(0)
  }

  process.once('SIGINT',  () => void shutdown('SIGINT'))
  process.once('SIGTERM', () => void shutdown('SIGTERM'))
}

void start().catch((err) => {
  console.error('Failed to start notification-service', err)
  process.exit(1)
})
