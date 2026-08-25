export interface RefundIssuedData {
  orderId: string
  amount?: number
  currency?: string
}

export function refundIssuedTemplate(data: RefundIssuedData) {
  return {
    subject: `Refund issued — Order #${data.orderId.slice(-8).toUpperCase()}`,
    html: `<h1>Refund issued</h1><p>Your refund for order #${data.orderId.slice(-8).toUpperCase()} has been issued.</p>${data.amount !== undefined ? `<p>Amount: ${data.amount} ${data.currency ?? ''}</p>` : ''}`,
    text: `Your refund for order #${data.orderId} has been issued.`,
  }
}
