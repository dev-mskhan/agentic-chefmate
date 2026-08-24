import { isEventProcessed, markEventProcessed } from '@chefmate/event-contracts'
import type { OrderEvent } from '@chefmate/event-contracts'
import { deriveNotificationId } from '../utils/idempotency'
import { getEmailQueue, getPushQueue, getInAppQueue } from '../queues/notification.queue'

export async function handleOrderEvent(event: OrderEvent): Promise<void> {
  const eventId = (event as OrderEvent & { eventId: string }).eventId
  if (await isEventProcessed(eventId)) return
  const emailQueue = getEmailQueue()
  const pushQueue  = getPushQueue()
  const inappQueue = getInAppQueue()

  switch (event.type) {
    case 'order.created': {
      // Chef: email + push + inapp
      const chefEmailId = deriveNotificationId('order.created', event.orderId, 'chef', 'email')
      const chefPushId  = deriveNotificationId('order.created', event.orderId, 'chef', 'push')
      const chefInappId = deriveNotificationId('order.created', event.orderId, 'chef', 'inapp')
      // User: email
      const userEmailId = deriveNotificationId('order.created', event.orderId, 'user', 'email')

      await emailQueue.add(
        'send-notification',
        {
          channel: 'email',
          template: 'new-order-chef',
          userId: event.chefId,
          notificationId: chefEmailId,
          data: { orderId: event.orderId, items: event.items, totalAmount: event.totalAmount },
        },
        { jobId: chefEmailId },
      )

      await pushQueue.add(
        'send-notification',
        {
          channel: 'push',
          template: 'new-order',
          userId: event.chefId,
          notificationId: chefPushId,
          data: { orderId: event.orderId },
        },
        { jobId: chefPushId },
      )

      await inappQueue.add(
        'send-notification',
        {
          channel: 'inapp',
          template: 'new-order-chef',
          userId: event.chefId,
          notificationId: chefInappId,
          data: { orderId: event.orderId, items: event.items, totalAmount: event.totalAmount },
        },
        { jobId: chefInappId },
      )

      await emailQueue.add(
        'send-notification',
        {
          channel: 'email',
          template: 'order-confirmed-user',
          userId: event.userId,
          notificationId: userEmailId,
          data: { orderId: event.orderId, items: event.items, totalAmount: event.totalAmount },
        },
        { jobId: userEmailId },
      )
      break
    }

    case 'order.status_changed': {
      const pushId  = deriveNotificationId('order.status_changed', event.orderId, 'push')
      const inappId = deriveNotificationId('order.status_changed', event.orderId, 'inapp')

      await pushQueue.add(
        'send-notification',
        {
          channel: 'push',
          template: 'status-update',
          userId: event.userId,
          notificationId: pushId,
          data: { orderId: event.orderId, newStatus: event.newStatus },
        },
        { jobId: pushId },
      )

      await inappQueue.add(
        'send-notification',
        {
          channel: 'inapp',
          template: 'status-update',
          userId: event.userId,
          notificationId: inappId,
          data: { orderId: event.orderId, newStatus: event.newStatus, oldStatus: event.oldStatus },
        },
        { jobId: inappId },
      )
      break
    }

    case 'order.completed': {
      const pushId  = deriveNotificationId('order.completed', event.orderId, 'push')
      const emailId = deriveNotificationId('order.completed', event.orderId, 'email')

      await pushQueue.add(
        'send-notification',
        {
          channel: 'push',
          template: 'leave-review',
          userId: event.userId,
          notificationId: pushId,
          data: { orderId: event.orderId, chefId: event.chefId },
        },
        { jobId: pushId },
      )

      await emailQueue.add(
        'send-notification',
        {
          channel: 'email',
          template: 'leave-review',
          userId: event.userId,
          notificationId: emailId,
          data: { orderId: event.orderId },
        },
        { jobId: emailId },
      )
      break
    }

    case 'order.cancelled': {
      // User: email + inapp
      const userEmailId = deriveNotificationId('order.cancelled', event.orderId, 'user', 'email')
      const userInappId = deriveNotificationId('order.cancelled', event.orderId, 'user', 'inapp')
      // Chef: email + inapp
      const chefEmailId = deriveNotificationId('order.cancelled', event.orderId, 'chef', 'email')
      const chefInappId = deriveNotificationId('order.cancelled', event.orderId, 'chef', 'inapp')

      await emailQueue.add(
        'send-notification',
        {
          channel: 'email',
          template: 'order-cancelled',
          userId: event.userId,
          notificationId: userEmailId,
          data: { orderId: event.orderId, reason: event.reason },
        },
        { jobId: userEmailId },
      )

      await inappQueue.add(
        'send-notification',
        {
          channel: 'inapp',
          template: 'order-cancelled',
          userId: event.userId,
          notificationId: userInappId,
          data: { orderId: event.orderId, reason: event.reason },
        },
        { jobId: userInappId },
      )

      await emailQueue.add(
        'send-notification',
        {
          channel: 'email',
          template: 'order-cancelled',
          userId: event.chefId,
          notificationId: chefEmailId,
          data: { orderId: event.orderId, reason: event.reason },
        },
        { jobId: chefEmailId },
      )

      await inappQueue.add(
        'send-notification',
        {
          channel: 'inapp',
          template: 'order-cancelled',
          userId: event.chefId,
          notificationId: chefInappId,
          data: { orderId: event.orderId, reason: event.reason },
        },
        { jobId: chefInappId },
      )
      break
    }

    case 'refund.issued': {
      // TODO: event.userId is not yet in the refund.issued contract.
      // Until the contract is updated, this job will be skipped by the
      // email worker's canNotify / resolveRecipient guard (fails gracefully).
      // Track: https://github.com/your-org/chefmate/issues/XXX
      const emailId = deriveNotificationId('refund.issued', event.orderId, 'email')
      await emailQueue.add(
        'send-notification',
        {
          channel: 'email',
          template: 'refund-issued',
          userId: event.userId,
          notificationId: emailId,
          data: { orderId: event.orderId, amount: event.amount },
        },
        { jobId: emailId },
      )
      break
    }

    default:
      break
  }
  await markEventProcessed(eventId)
}
