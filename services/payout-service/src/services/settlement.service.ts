import { EarningsLedger } from '../models/earnings-ledger.model'
import { calculateFee }   from './fee.service'
import { publishPayoutEvent } from './event.service'
import { config }         from '../config'
import { createLogger }   from '@chefmate/logger'
import type { OrderEvent, PaymentEvent, ConnectEvent } from '@chefmate/event-contracts'

const logger = createLogger('payout-service:settlement')

export async function handleOrderCompleted(
  event: Extract<OrderEvent, { type: 'order.completed' }>,
): Promise<void> {
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

  const entry = await EarningsLedger.create({
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
}

export async function handlePaymentRefunded(
  event: Extract<PaymentEvent, { type: 'payment.refunded' }>,
): Promise<void> {
  const idempotencyKey = `${event.paymentId}:refund`
  const existing = await EarningsLedger.findOne({ idempotencyKey })
  if (existing) { logger.info({ idempotencyKey }, 'Debit already recorded — skipping'); return }

  // Find the original credit entry to get chefId
  const creditEntry = await EarningsLedger.findOne({ paymentId: event.paymentId, type: 'CREDIT' })
  if (!creditEntry) {
    logger.warn({ paymentId: event.paymentId }, 'No credit entry found for refund — skipping')
    return
  }

  const entry = await EarningsLedger.create({
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
}

export async function handlePaymentPartiallyRefunded(
  event: Extract<PaymentEvent, { type: 'payment.partially_refunded' }>,
): Promise<void> {
  const idempotencyKey = `${event.paymentId}:partial_refund`
  const existing = await EarningsLedger.findOne({ idempotencyKey })
  if (existing) { logger.info({ idempotencyKey }, 'Partial refund debit already recorded — skipping'); return }

  const creditEntry = await EarningsLedger.findOne({ paymentId: event.paymentId, type: 'CREDIT' })
  if (!creditEntry) { logger.warn({ paymentId: event.paymentId }, 'No credit entry for partial refund — skipping'); return }

  const entry = await EarningsLedger.create({
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
}

export async function handleDisputeCreated(
  event: Extract<ConnectEvent, { type: 'connect.dispute_created' }>,
): Promise<void> {
  const idempotencyKey = `${event.disputeId}:hold`
  const existing = await EarningsLedger.findOne({ idempotencyKey })
  if (existing) { logger.info({ idempotencyKey }, 'Hold already recorded — skipping'); return }

  // Find chef from payment
  const creditEntry = await EarningsLedger.findOne({ paymentId: event.paymentIntentId, type: 'CREDIT' })
  if (!creditEntry) { logger.warn({ paymentIntentId: event.paymentIntentId }, 'No credit entry for dispute — skipping'); return }

  const entry = await EarningsLedger.create({
    chefId:           creditEntry.chefId,
    orderId:          creditEntry.orderId,
    paymentId:        event.paymentIntentId,
    type:             'HOLD',
    grossAmountCents: event.amount,
    platformFeeCents: 0,
    netAmountCents:   event.amount,
    currency:         event.currency,
    status:           'PENDING',
    availableAt:      new Date(),
    idempotencyKey,
  })

  await publishPayoutEvent({
    type:             'payout.disputed',
    chefId:           creditEntry.chefId,
    orderId:          creditEntry.orderId ?? '',
    paymentId:        event.paymentIntentId,
    holdAmountCents:  event.amount,
    currency:         event.currency,
    ledgerEntryId:    (entry._id as { toString(): string }).toString(),
    createdAt:        new Date().toISOString(),
    version:          '1',
  })
}
