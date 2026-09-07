export const PAYMENT_EVENTS_TOPIC = 'payment.events'

export type PaymentStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'REFUNDED'
  | 'PARTIALLY_REFUNDED'

export type PaymentEvent =
  | {
      type: 'payment.created'
      paymentId:  string
      orderId:    string
      customerId: string
      amount:     number
      currency:   string
      createdAt:  string
      version:    '1'
    }
  | {
      type: 'payment.processing'
      paymentId:  string
      orderId:    string
      customerId: string
      createdAt:  string
      version:    '1'
    }
  | {
      type: 'payment.succeeded'
      paymentId:  string
      orderId:    string
      customerId: string
      amount:     number
      currency:   string
      createdAt:  string
      version:    '1'
    }
  | {
      type: 'payment.failed'
      paymentId:  string
      orderId:    string
      customerId: string
      reason:     string
      createdAt:  string
      version:    '1'
    }
  | {
      type: 'payment.refunded'
      paymentId:      string
      orderId:        string
      customerId:     string
      amount:         number
      currency:       string
      stripeRefundId: string
      createdAt:      string
      version:        '1'
    }
  | {
      type: 'payment.partially_refunded'
      paymentId:       string
      orderId:         string
      customerId:      string
      refundedAmount:  number
      remainingAmount: number
      currency:        string
      stripeRefundId:  string
      createdAt:       string
      version:         '1'
    }
