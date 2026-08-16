import type { SubscriptionEvent } from '@chefmate/event-contracts'
import { deriveNotificationId } from '../utils/idempotency'
import { getEmailQueue, getInAppQueue } from '../queues/notification.queue'

export async function handleSubscriptionEvent(event: SubscriptionEvent): Promise<void> {
  const emailQueue = getEmailQueue()
  const inappQueue = getInAppQueue()

  switch (event.type) {
    case 'subscription.activated': {
      const emailId = deriveNotificationId('subscription.activated', event.subscriptionId, 'email')
      const inappId = deriveNotificationId('subscription.activated', event.subscriptionId, 'inapp')
      await emailQueue.add('send-notification', {
        channel: 'email', template: 'subscription-activated', userId: event.customerId,
        notificationId: emailId, data: { subscriptionId: event.subscriptionId, planId: event.planId, orderId: event.orderId },
      }, { jobId: emailId })
      await inappQueue.add('send-notification', {
        channel: 'inapp', template: 'subscription-activated', userId: event.customerId,
        notificationId: inappId, data: { subscriptionId: event.subscriptionId },
      }, { jobId: inappId })
      break
    }
    case 'subscription.paused': {
      const inappId = deriveNotificationId('subscription.paused', event.subscriptionId, 'inapp')
      await inappQueue.add('send-notification', {
        channel: 'inapp', template: 'subscription-paused', userId: event.customerId,
        notificationId: inappId, data: { subscriptionId: event.subscriptionId },
      }, { jobId: inappId })
      break
    }
    case 'subscription.resumed': {
      const inappId = deriveNotificationId('subscription.resumed', event.subscriptionId, 'inapp')
      await inappQueue.add('send-notification', {
        channel: 'inapp', template: 'subscription-resumed', userId: event.customerId,
        notificationId: inappId, data: { subscriptionId: event.subscriptionId, nextBillingDate: event.nextBillingDate },
      }, { jobId: inappId })
      break
    }
    case 'subscription.cancelled': {
      const emailId = deriveNotificationId('subscription.cancelled', event.subscriptionId, 'email')
      const inappId = deriveNotificationId('subscription.cancelled', event.subscriptionId, 'inapp')
      await emailQueue.add('send-notification', {
        channel: 'email', template: 'subscription-cancelled', userId: event.customerId,
        notificationId: emailId, data: { subscriptionId: event.subscriptionId, cancellationReason: event.cancellationReason },
      }, { jobId: emailId })
      await inappQueue.add('send-notification', {
        channel: 'inapp', template: 'subscription-cancelled', userId: event.customerId,
        notificationId: inappId, data: { subscriptionId: event.subscriptionId },
      }, { jobId: inappId })
      break
    }
    case 'subscription.past_due': {
      const emailId = deriveNotificationId('subscription.past_due', event.subscriptionId, event.periodStart, 'email')
      const inappId = deriveNotificationId('subscription.past_due', event.subscriptionId, event.periodStart, 'inapp')
      await emailQueue.add('send-notification', {
        channel: 'email', template: 'subscription-past-due', userId: event.customerId,
        notificationId: emailId, data: { subscriptionId: event.subscriptionId, reason: event.reason },
      }, { jobId: emailId })
      await inappQueue.add('send-notification', {
        channel: 'inapp', template: 'subscription-past-due', userId: event.customerId,
        notificationId: inappId, data: { subscriptionId: event.subscriptionId },
      }, { jobId: inappId })
      break
    }
    case 'subscription.order_generated': {
      const inappId = deriveNotificationId('subscription.order_generated', event.subscriptionId, event.periodStart, 'inapp')
      await inappQueue.add('send-notification', {
        channel: 'inapp', template: 'subscription-order-created', userId: event.customerId,
        notificationId: inappId, data: { subscriptionId: event.subscriptionId, orderId: event.orderId },
      }, { jobId: inappId })
      break
    }
    case 'subscription.skipped': {
      const inappId = deriveNotificationId('subscription.skipped', event.subscriptionId, event.skippedPeriod, 'inapp')
      await inappQueue.add('send-notification', {
        channel: 'inapp', template: 'subscription-skipped', userId: event.customerId,
        notificationId: inappId, data: { subscriptionId: event.subscriptionId, skippedPeriod: event.skippedPeriod },
      }, { jobId: inappId })
      break
    }
    default:
      break
  }
}
