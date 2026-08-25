export interface OrderCancelledData {
  orderId: string
  reason?: string
}

export function orderCancelledTemplate(data: OrderCancelledData) {
  return {
    subject: `Order cancelled — #${data.orderId.slice(-8).toUpperCase()}`,
    html: `<h1>Order cancelled</h1><p>Order #${data.orderId.slice(-8).toUpperCase()} was cancelled.</p>${data.reason ? `<p>Reason: ${data.reason}</p>` : ''}`,
    text: `Order #${data.orderId} was cancelled.${data.reason ? ` Reason: ${data.reason}` : ''}`,
  }
}
