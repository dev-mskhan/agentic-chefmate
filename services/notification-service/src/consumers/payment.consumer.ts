import type { PaymentEvent } from '@chefmate/event-contracts'
import { deriveNotificationId } from '../utils/idempotency'
import { getEmailQueue, getInAppQueue } from '../queues/notification.queue'

export async function handlePaymentEvent(event: PaymentEvent): Promise<void> {
  const emailQueue = getEmailQueue()
  const inappQueue = getInAppQueue()

  switch (event.type) {
    case 'payment.succeeded': {
      const emailId = deriveNotificationId('payment.succeeded', event.paymentId, 'email')
      const inappId = deriveNotificationId('payment.succeeded', event.paymentId, 'inapp')

      await emailQueue.add('send-notification', {
        channel: 'email', template: 'payment-confirmed', userId: event.customerId,
        notificationId: emailId, data: { orderId: event.orderId, amount: event.amount, currency: event.currency },
      }, { jobId: emailId })

      await inappQueue.add('send-notification', {
        channel: 'inapp', template: 'payment-confirmed', userId: event.customerId,
        notificationId: inappId, data: { orderId: event.orderId },
      }, { jobId: inappId })
      break
    }

    case 'payment.failed': {
      const emailId = deriveNotificationId('payment.failed', event.paymentId, 'email')
      const inappId = deriveNotificationId('payment.failed', event.paymentId, 'inapp')

      await emailQueue.add('send-notification', {
        channel: 'email', template: 'payment-failed', userId: event.customerId,
        notificationId: emailId, data: { orderId: event.orderId, reason: event.reason },
      }, { jobId: emailId })

      await inappQueue.add('send-notification', {
        channel: 'inapp', template: 'payment-failed', userId: event.customerId,
        notificationId: inappId, data: { orderId: event.orderId },
      }, { jobId: inappId })
      break
    }

    case 'payment.refunded': {
      const emailId = deriveNotificationId('payment.refunded', event.paymentId, 'email')
      const inappId = deriveNotificationId('payment.refunded', event.paymentId, 'inapp')

      await emailQueue.add('send-notification', {
        channel: 'email', template: 'refund-issued', userId: event.customerId,
        notificationId: emailId, data: { orderId: event.orderId, amount: event.amount, currency: event.currency },
      }, { jobId: emailId })

      await inappQueue.add('send-notification', {
        channel: 'inapp', template: 'refund-issued', userId: event.customerId,
        notificationId: inappId, data: { orderId: event.orderId, amount: event.amount },
      }, { jobId: inappId })
      break
    }

    default:
      break
  }
}
