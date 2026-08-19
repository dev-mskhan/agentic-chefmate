export const PAYOUT_EVENTS_TOPIC = 'payout.events'

export type PayoutEvent =
  | {
      type: 'payout.earning_created'
      chefId: string; orderId: string; paymentId: string
      grossAmountCents: number; platformFeeCents: number; netAmountCents: number
      currency: string; ledgerEntryId: string; createdAt: string; version: '1'
    }
  | {
      type: 'payout.transfer_created'
      chefId: string; payoutId: string; stripeTransferId: string
      amountCents: number; currency: string; createdAt: string; version: '1'
    }
  | {
      type: 'payout.completed'
      chefId: string; payoutId: string; stripePayoutId: string
      amountCents: number; currency: string; createdAt: string; version: '1'
    }
  | {
      type: 'payout.failed'
      chefId: string; payoutId: string; reason: string; createdAt: string; version: '1'
    }
  | {
      type: 'payout.refunded'
      chefId: string; orderId: string; paymentId: string
      debitAmountCents: number; currency: string; ledgerEntryId: string; createdAt: string; version: '1'
    }
  | {
      type: 'payout.disputed'
      chefId: string; orderId: string; paymentId: string
      holdAmountCents: number; currency: string; ledgerEntryId: string; createdAt: string; version: '1'
    }
