export interface SubscriptionCancelledData {
  subscriptionId:      string
  cancellationReason?: string
}

export function subscriptionCancelledTemplate(data: SubscriptionCancelledData) {
  return {
    subject: 'Your subscription has been cancelled',
    html: `
      <h1>Subscription Cancelled</h1>
      <p>Your meal plan subscription has been cancelled.</p>
      ${data.cancellationReason ? `<p>Reason: ${data.cancellationReason}</p>` : ''}
      <p>Your past orders and order history remain accessible.</p>
    `,
    text: `Your subscription has been cancelled.`,
  }
}
