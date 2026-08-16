export interface SubscriptionPastDueData {
  subscriptionId: string
  reason?:        string
}

export function subscriptionPastDueTemplate(data: SubscriptionPastDueData) {
  return {
    subject: 'Action required: Subscription payment failed',
    html: `
      <h1>Payment issue with your subscription</h1>
      <p>We couldn't process the payment for your meal plan subscription.</p>
      ${data.reason ? `<p>Reason: ${data.reason}</p>` : ''}
      <p>Please update your payment method to reactivate your subscription.</p>
      <a href="${process.env['APP_URL'] ?? 'http://localhost:3000'}/subscriptions/${data.subscriptionId}"
         style="background:#f97316;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;">
        Update Payment
      </a>
    `,
    text: `Subscription payment failed. Please update your payment method.`,
  }
}
