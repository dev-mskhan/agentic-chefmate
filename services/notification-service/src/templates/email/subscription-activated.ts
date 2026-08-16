export interface SubscriptionActivatedData {
  subscriptionId: string
  planId:         string
  orderId:        string
}

export function subscriptionActivatedTemplate(data: SubscriptionActivatedData) {
  return {
    subject: 'Your subscription is active!',
    html: `
      <h1>Subscription confirmed!</h1>
      <p>Your meal plan subscription is now active. Your first order is being prepared.</p>
      <p><strong>Subscription ID:</strong> ${data.subscriptionId}</p>
      <a href="${process.env['APP_URL'] ?? 'http://localhost:3000'}/subscriptions/${data.subscriptionId}"
         style="background:#f97316;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;">
        View Subscription
      </a>
    `,
    text: `Your subscription is active! View it at: ${process.env['APP_URL'] ?? 'http://localhost:3000'}/subscriptions/${data.subscriptionId}`,
  }
}
