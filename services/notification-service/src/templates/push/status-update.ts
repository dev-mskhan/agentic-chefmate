export interface StatusUpdatePushData {
  orderId: string
  newStatus: string
}

const STATUS_LABELS: Record<string, string> = {
  CONFIRMED: 'Your order has been confirmed',
  PREPARING: 'Your chef is preparing your meal',
  READY: 'Your meal is ready!',
  DELIVERED: 'Your order has been delivered',
  CANCELLED: 'Your order was cancelled',
}

export function statusUpdatePush(data: StatusUpdatePushData) {
  return {
    title: '📦 Order update',
    body: STATUS_LABELS[data.newStatus] ?? `Order status: ${data.newStatus}`,
    data: { orderId: data.orderId, screen: 'orders' },
  }
}
