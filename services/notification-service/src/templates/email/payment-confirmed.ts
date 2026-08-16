export interface PaymentConfirmedData {
  orderId:  string
  amount:   number
  currency: string
}

export function paymentConfirmedTemplate(data: PaymentConfirmedData) {
  const display = (data.amount / 100).toFixed(2)
  return {
    subject: `Payment confirmed — Order #${data.orderId.slice(-8).toUpperCase()}`,
    html: `
      <h1>Payment confirmed!</h1>
      <p>Your payment of <strong>${display} ${data.currency.toUpperCase()}</strong> was successful.</p>
      <p>Your chef has been notified and will start preparing your order.</p>
      <a href="${process.env['APP_URL'] ?? 'http://localhost:3000'}/orders/${data.orderId}"
         style="background:#f97316;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;">
        Track Order
      </a>
    `,
    text: `Payment of ${display} ${data.currency.toUpperCase()} confirmed for order #${data.orderId}.`,
  }
}
