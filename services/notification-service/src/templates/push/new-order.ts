export interface NewOrderPushData {
  orderId: string
}

export function newOrderPush(data: NewOrderPushData) {
  return {
    title: '🍳 New order received!',
    body: `Order #${data.orderId.slice(-8).toUpperCase()} is waiting for your confirmation.`,
    data: { orderId: data.orderId, screen: 'chef/orders' },
  }
}
