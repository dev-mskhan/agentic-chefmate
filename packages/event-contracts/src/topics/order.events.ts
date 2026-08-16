export const ORDER_EVENTS_TOPIC = 'order.events'

export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'READY'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED'

export interface OrderItem {
  dishId: string
  name: string
  quantity: number
  price: number
}

export type OrderEvent =
  | {
      type: 'order.created'
      orderId: string
      userId: string
      chefId: string
      items: OrderItem[]
      totalAmount: number
      createdAt: string
      version: '1'
    }
  | {
      type: 'order.status_changed'
      orderId: string
      userId: string
      oldStatus: OrderStatus
      newStatus: OrderStatus
      createdAt: string
      version: '1'
    }
  | {
      type: 'order.cancelled'
      orderId: string
      userId: string
      chefId: string
      reason: string
      createdAt: string
      version: '1'
    }
  | {
      type: 'order.completed'
      orderId: string
      userId: string
      chefId: string
      createdAt: string
      version: '1'
    }
  | {
      type: 'payment.captured'
      orderId: string
      stripePaymentIntentId: string
      amount: number
      createdAt: string
      version: '1'
    }
  | {
      type: 'refund.issued'
      orderId: string
      userId:  string
      amount:  number
      reason:  string
      createdAt: string
      version: '1'
    }
