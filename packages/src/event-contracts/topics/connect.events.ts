export const CONNECT_EVENTS_TOPIC = 'connect.events'

export type ConnectEvent =
  | {
      type: 'connect.account_updated'
      accountId: string; account: Record<string, unknown>; createdAt: string; version: '1'
    }
  | {
      type: 'connect.dispute_created'
      eventId?: string; disputeId: string; chargeId: string; paymentIntentId: string; paymentId?: string
      amount: number; currency: string; reason: string; createdAt: string; version: '1'
    }
  | {
      type: 'connect.dispute_updated'
      disputeId: string; chargeId: string; status: string; updatedAt: string; version: '1'
    }
  | {
      type: 'connect.dispute_closed'
      disputeId: string; chargeId: string; status: string; closedAt: string; version: '1'
    }
