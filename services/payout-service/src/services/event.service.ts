import { Kafka } from 'kafkajs'
import {
  createProducer, TypedProducer,
  createConsumer, TypedConsumer,
  PAYOUT_EVENTS_TOPIC, PayoutEvent,
  ORDER_EVENTS_TOPIC, OrderEvent,
  PAYMENT_EVENTS_TOPIC, PaymentEvent,
  CONNECT_EVENTS_TOPIC, ConnectEvent,
} from '@chefmate/event-contracts'
import { createLogger } from '@chefmate/logger'
import { EarningsLedger } from '../models/earnings-ledger.model'

const logger = createLogger('payout-service:events')

let producer: TypedProducer | null = null
let orderConsumer: TypedConsumer | null = null
let paymentConsumer: TypedConsumer | null = null
let connectConsumer: TypedConsumer | null = null

export async function initEventService(broker: string): Promise<void> {
  const kafka = new Kafka({ clientId: 'payout-service', brokers: [broker] })

  producer = createProducer(kafka)
  await producer.connect()

  orderConsumer   = createConsumer(kafka, 'payout-service-orders')
  paymentConsumer = createConsumer(kafka, 'payout-service-payments')
  connectConsumer = createConsumer(kafka, 'payout-service-connect')

  // Lazy import handlers to avoid circular deps
  const settlement = await import('./settlement.service')
  const connect    = await import('./connect.service')
  await EarningsLedger.createIndexes()

  await orderConsumer.subscribe<OrderEvent>(ORDER_EVENTS_TOPIC, async (event) => {
    if (event.type === 'order.completed') {
      await settlement.handleOrderCompleted(event as Extract<OrderEvent, { type: 'order.completed' }>)
    }
  })

  await paymentConsumer.subscribe<PaymentEvent>(PAYMENT_EVENTS_TOPIC, async (event) => {
    if (event.type === 'payment.refunded') {
      await settlement.handlePaymentRefunded(event as Extract<PaymentEvent, { type: 'payment.refunded' }>)
    } else if (event.type === 'payment.partially_refunded') {
      await settlement.handlePaymentPartiallyRefunded(event as Extract<PaymentEvent, { type: 'payment.partially_refunded' }>)
    }
  })

  await connectConsumer.subscribe<ConnectEvent>(CONNECT_EVENTS_TOPIC, async (event) => {
    if (event.type === 'connect.account_updated') {
      const account = event.account as unknown as import('stripe').default.Account
      await connect.handleAccountUpdated(account)
    } else if (event.type === 'connect.dispute_created') {
      await settlement.handleDisputeCreated(event as Extract<ConnectEvent, { type: 'connect.dispute_created' }>)
    }
  })

  logger.info('Kafka producers and consumers initialized')
}

export async function disconnectEventService(): Promise<void> {
  await Promise.allSettled([
    producer?.disconnect(),
    orderConsumer?.disconnect(),
    paymentConsumer?.disconnect(),
    connectConsumer?.disconnect(),
  ])
  producer = paymentConsumer = orderConsumer = connectConsumer = null
}

export async function publishPayoutEvent(event: PayoutEvent): Promise<void> {
  if (!producer) {
    logger.warn({ type: event.type }, 'Producer not initialized — skipping payout event')
    return
  }
  try {
    await producer.emit(PAYOUT_EVENTS_TOPIC, event)
  } catch (err) {
    logger.error({ err, eventType: event.type }, 'Failed to publish payout event')
  }
}
