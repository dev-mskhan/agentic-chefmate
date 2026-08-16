export const SUBSCRIPTION_EVENTS_TOPIC = 'subscription.events'

export type SubscriptionFrequency = 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY'

export type SubscriptionEvent =
  | {
      type:           'subscription.created'
      subscriptionId: string
      customerId:     string
      planId:         string
      chefId:         string
      frequency:      SubscriptionFrequency
      amountCents:    number
      currency:       string
      createdAt:      string
      version:        '1'
    }
  | {
      type:           'subscription.activated'
      subscriptionId: string
      customerId:     string
      planId:         string
      chefId:         string
      orderId:        string
      createdAt:      string
      version:        '1'
    }
  | {
      type:           'subscription.paused'
      subscriptionId: string
      customerId:     string
      planId:         string
      chefId:         string
      createdAt:      string
      version:        '1'
    }
  | {
      type:           'subscription.resumed'
      subscriptionId: string
      customerId:     string
      planId:         string
      chefId:         string
      nextBillingDate: string
      createdAt:      string
      version:        '1'
    }
  | {
      type:           'subscription.skipped'
      subscriptionId: string
      customerId:     string
      planId:         string
      chefId:         string
      skippedPeriod:  string   // YYYY-MM-DD
      nextBillingDate: string
      createdAt:      string
      version:        '1'
    }
  | {
      type:           'subscription.swapped'
      subscriptionId: string
      customerId:     string
      planId:         string
      chefId:         string
      oldDishId:      string
      newDishId:      string
      effectivePeriod: string  // YYYY-MM-DD of next period start
      createdAt:      string
      version:        '1'
    }
  | {
      type:               'subscription.cancelled'
      subscriptionId:     string
      customerId:         string
      planId:             string
      chefId:             string
      cancellationReason?: string
      createdAt:          string
      version:            '1'
    }
  | {
      type:           'subscription.billing_due'
      subscriptionId: string
      customerId:     string
      planId:         string
      chefId:         string
      periodStart:    string   // YYYY-MM-DD
      periodEnd:      string   // YYYY-MM-DD
      amountCents:    number
      currency:       string
      createdAt:      string
      version:        '1'
    }
  | {
      type:           'subscription.order_generated'
      subscriptionId: string
      customerId:     string
      planId:         string
      chefId:         string
      orderId:        string
      periodStart:    string
      createdAt:      string
      version:        '1'
    }
  | {
      type:           'subscription.past_due'
      subscriptionId: string
      customerId:     string
      planId:         string
      chefId:         string
      periodStart:    string
      reason:         string
      createdAt:      string
      version:        '1'
    }
