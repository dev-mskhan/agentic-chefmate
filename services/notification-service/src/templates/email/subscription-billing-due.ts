export interface SubscriptionBillingDueData {
  subscriptionId: string
  amountCents?: number
  currency?: string
  periodStart?: string
  periodEnd?: string
}

export function subscriptionBillingDueTemplate(data: SubscriptionBillingDueData) {
  return {
    subject: 'Upcoming subscription billing',
    html: `<h1>Upcoming subscription billing</h1><p>Your subscription will be billed soon.</p>${data.amountCents !== undefined ? `<p>Amount: ${data.amountCents} ${data.currency ?? ''}</p>` : ''}`,
    text: 'Your subscription will be billed soon.',
  }
}
