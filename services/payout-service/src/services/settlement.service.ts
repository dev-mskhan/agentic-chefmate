import { EarningsLedger } from '../models/earnings-ledger.model'
import { calculateFee }   from './fee.service'
import { publishPayoutEvent } from './event.service'
import { config }         from '../config'
import { createLogger }   from '@chefmate/logger'
import type { OrderEvent, PaymentEvent, ConnectEvent } from '@chefmate/event-contracts'
import { isEventProcessed, markEventProcessed } from '@chefmate/event-contracts'

const logger = createLogger('payout-service:settlement')

const CREDIT_WAIT_ATTEMPTS = 30
const CREDIT_WAIT_MS = 1000

function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 11000
}

async function findCreditWithRetry(paymentId: string) {
  for (let attempt = 0; attempt < CREDIT_WAIT_ATTEMPTS; attempt++) {
    const credit = await EarningsLedger.findOne({ paymentId, type: 'CREDIT' })
    if (credit) return credit
    await new Promise((resolve) => setTimeout(resolve, CREDIT_WAIT_MS))
  }
  return null
}

export async function handleOrderCompleted(
  event: Extract<OrderEvent, { type: 'order.completed' }>,
): Promise<void> {
  const eventId = (event as typeof event & { eventId: string }).eventId
  if (await isEventProcessed(eventId)) return
  const idempotencyKey = `${event.orderId}:credit`

  // Idempotency guard
  const existing = await EarningsLedger.findOne({ idempotencyKey })
  if (existing) {
    logger.info({ idempotencyKey }, 'Ledger entry already exists — skipping duplicate')
    return
  }

  // We need the payment amount. For MVP, we resolve it from the Payment collection
  // by orderId. Since payout-service shares the same MongoDB, we read directly.
  // Lazy import to avoid circular deps
  const { Payment } = await import('./payment-reader.service')
  const payment = await Payment.findOne({ orderId: event.orderId }).lean()
  if (!payment) {
    logger.warn({ orderId: event.orderId }, 'No payment found for completed order — skipping settlement')
    return
  }

  const fee = calculateFee((payment as any).amountCents as number, config.PLATFORM_FEE_BPS ?? 1000)

  let entry
  try {
    entry = await EarningsLedger.create({
      chefId:           event.chefId,
      orderId:          event.orderId,
      paymentId:        (payment as any)._id.toString(),
      type:             'CREDIT',
      grossAmountCents: fee.grossAmountCents,
      platformFeeCents: fee.platformFeeCents,
      netAmountCents:   fee.netAmountCents,
      currency:         (payment as any).currency as string,
      status:           'AVAILABLE',
      availableAt:      new Date(),
      idempotencyKey,
    })
  } catch (error) {
    if (!isDuplicateKeyError(error)) throw error
    entry = await EarningsLedger.findOne({ idempotencyKey })
    if (!entry) throw error
  }

  logger.info({ chefId: event.chefId, orderId: event.orderId, netAmountCents: fee.netAmountCents }, 'Earnings credited')

  await publishPayoutEvent({
    type:             'payout.earning_created',
    chefId:           event.chefId,
    orderId:          event.orderId,
    paymentId:        entry.paymentId ?? '',
    grossAmountCents: fee.grossAmountCents,
    platformFeeCents: fee.platformFeeCents,
    netAmountCents:   fee.netAmountCents,
    currency:         entry.currency,
    ledgerEntryId:    (entry._id as { toString(): string }).toString(),
    createdAt:        new Date().toISOString(),
    version:          '1',
  })
  await markEventProcessed(eventId)
}

export async function handlePaymentRefunded(
  event: Extract<PaymentEvent, { type: 'payment.refunded' }>,
): Promise<void> {
  const eventId = (event as typeof event & { eventId: string }).eventId
  if (await isEventProcessed(eventId)) return
  const idempotencyKey = `${event.paymentId}:refund`
  const existing = await EarningsLedger.findOne({ idempotencyKey })
  if (existing) { logger.info({ idempotencyKey }, 'Debit already recorded — skipping'); return }

  // Find the original credit entry to get chefId
  const creditEntry = await findCreditWithRetry(event.paymentId)
  if (!creditEntry) {
    throw new Error(`Credit entry not available for refund ${event.paymentId}`)
  }

  let entry
  try {
    entry = await EarningsLedger.create({
      chefId:           creditEntry.chefId,
      orderId:          event.orderId,
      paymentId:        event.paymentId,
      type:             'DEBIT',
      grossAmountCents: event.amount,
      platformFeeCents: 0,
      netAmountCents:   event.amount,
      currency:         event.currency,
      status:           'AVAILABLE',
      availableAt:      new Date(),
      idempotencyKey,
    })
  } catch (error) {
    if (!isDuplicateKeyError(error)) throw error
    entry = await EarningsLedger.findOne({ idempotencyKey })
    if (!entry) throw error
  }

  logger.info({ chefId: creditEntry.chefId, amount: event.amount }, 'Refund debit recorded')

  await publishPayoutEvent({
    type:             'payout.refunded',
    chefId:           creditEntry.chefId,
    orderId:          event.orderId,
    paymentId:        event.paymentId,
    debitAmountCents: event.amount,
    currency:         event.currency,
    ledgerEntryId:    (entry._id as { toString(): string }).toString(),
    createdAt:        new Date().toISOString(),
    version:          '1',
  })
  await markEventProcessed(eventId)
}

export async function handlePaymentPartiallyRefunded(
  event: Extract<PaymentEvent, { type: 'payment.partially_refunded' }>,
): Promise<void> {
  const eventId = (event as typeof event & { eventId: string }).eventId
  if (await isEventProcessed(eventId)) return
  const idempotencyKey = `${event.paymentId}:partial_refund`
  const existing = await EarningsLedger.findOne({ idempotencyKey })
  if (existing) { logger.info({ idempotencyKey }, 'Partial refund debit already recorded — skipping'); return }

  const creditEntry = await findCreditWithRetry(event.paymentId)
  if (!creditEntry) throw new Error(`Credit entry not available for partial refund ${event.paymentId}`)

  let entry
  try {
    entry = await EarningsLedger.create({
      chefId:           creditEntry.chefId,
      orderId:          event.orderId,
      paymentId:        event.paymentId,
      type:             'DEBIT',
      grossAmountCents: event.refundedAmount,
      platformFeeCents: 0,
      netAmountCents:   event.refundedAmount,
      currency:         event.currency,
      status:           'AVAILABLE',
      availableAt:      new Date(),
      idempotencyKey,
    })
  } catch (error) {
    if (!isDuplicateKeyError(error)) throw error
    entry = await EarningsLedger.findOne({ idempotencyKey })
    if (!entry) throw error
  }

  await publishPayoutEvent({
    type:             'payout.refunded',
    chefId:           creditEntry.chefId,
    orderId:          event.orderId,
    paymentId:        event.paymentId,
    debitAmountCents: event.refundedAmount,
    currency:         event.currency,
    ledgerEntryId:    (entry._id as { toString(): string }).toString(),
    createdAt:        new Date().toISOString(),
    version:          '1',
  })
  await markEventProcessed(eventId)
}

export async function handleDisputeCreated(
  event: Extract<ConnectEvent, { type: 'connect.dispute_created' }>,
): Promise<void> {
  const eventId = (event as typeof event & { eventId: string }).eventId
  if (await isEventProcessed(eventId)) return
  const idempotencyKey = `${event.disputeId}:hold`
  const existing = await EarningsLedger.findOne({ idempotencyKey })
  if (existing) { logger.info({ idempotencyKey }, 'Hold already recorded — skipping'); return }

  // Find chef from payment
  const creditEntry = await findCreditWithRetry(event.paymentId ?? event.paymentIntentId)
  if (!creditEntry) throw new Error(`Credit entry not available for dispute ${event.paymentIntentId}`)

  let entry
  try {
    entry = await EarningsLedger.create({
      chefId:           creditEntry.chefId,
      orderId:          creditEntry.orderId,
      paymentId:        event.paymentId ?? event.paymentIntentId,
      type:             'HOLD',
      grossAmountCents: event.amount,
      platformFeeCents: 0,
      netAmountCents:   event.amount,
      currency:         event.currency,
      status:           'PENDING',
      availableAt:      new Date(),
      idempotencyKey,
    })
  } catch (error) {
    if (!isDuplicateKeyError(error)) throw error
    entry = await EarningsLedger.findOne({ idempotencyKey })
    if (!entry) throw error
  }

  await publishPayoutEvent({
    type:             'payout.disputed',
    chefId:           creditEntry.chefId,
    orderId:          creditEntry.orderId ?? '',
    paymentId:        event.paymentId ?? event.paymentIntentId,
    holdAmountCents:  event.amount,
    currency:         event.currency,
    ledgerEntryId:    (entry._id as { toString(): string }).toString(),
    createdAt:        new Date().toISOString(),
    version:          '1',
  })
  await markEventProcessed(eventId)
}
