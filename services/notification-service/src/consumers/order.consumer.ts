import type { Queue } from 'bullmq'
import type { OrderEvent } from '@chefmate/event-contracts'
import type { NotificationJob } from '../queues/notification.queue'
import { deriveNotificationId } from '../utils/idempotency'

export async function handleOrderEvent(
  event: OrderEvent,
  queue: Queue<NotificationJob>,
): Promise<void> {
  switch (event.type) {
    case 'order.created': {
      // Chef: email + push + inapp
      const chefEmailId = deriveNotificationId('order.created', event.orderId, 'chef', 'email')
      const chefPushId  = deriveNotificationId('order.created', event.orderId, 'chef', 'push')
      const chefInappId = deriveNotificationId('order.created', event.orderId, 'chef', 'inapp')
      // User: email
      const userEmailId = deriveNotificationId('order.created', event.orderId, 'user', 'email')

      await queue.add(
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

      await queue.add(
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

      await queue.add(
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

      await queue.add(
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
      // FIX 6: use event.userId (field added to contract) instead of event.orderId
      const pushId  = deriveNotificationId('order.status_changed', event.orderId, 'push')
      const inappId = deriveNotificationId('order.status_changed', event.orderId, 'inapp')

      await queue.add(
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

      await queue.add(
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

      await queue.add(
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

      await queue.add(
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

      await queue.add(
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

      await queue.add(
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

      await queue.add(
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

      await queue.add(
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
      // refund.issued does not carry userId — keep orderId as placeholder;
      // the email worker resolves the recipient via an order-service lookup (TODO)
      const emailId = deriveNotificationId('refund.issued', event.orderId, 'email')
      await queue.add(
        'send-notification',
        {
          channel: 'email',
          template: 'refund-issued',
          userId: event.orderId, // resolved by worker
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
}
