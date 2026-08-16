export interface PaymentFailedData {
  orderId: string
  reason?: string
}

export function paymentFailedTemplate(data: PaymentFailedData) {
  return {
    subject: `Payment failed — Order #${data.orderId.slice(-8).toUpperCase()}`,
    html: `
      <h1>Payment failed</h1>
      <p>We couldn't process your payment for order #${data.orderId.slice(-8).toUpperCase()}.</p>
      ${data.reason ? `<p>Reason: ${data.reason}</p>` : ''}
      <p>Please try again with a different payment method.</p>
      <a href="${process.env['APP_URL'] ?? 'http://localhost:3000'}/orders/${data.orderId}/pay"
         style="background:#f97316;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;">
        Retry Payment
      </a>
    `,
    text: `Payment failed for order #${data.orderId}. Please retry.`,
  }
}
