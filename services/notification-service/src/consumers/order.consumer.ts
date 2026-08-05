import type { Queue } from 'bullmq'
import type { OrderEvent } from '@chefmate/event-contracts'
import type { NotificationJob } from '../queues/notification.queue'
import crypto from 'crypto'

export async function handleOrderEvent(
  event: OrderEvent,
  queue: Queue<NotificationJob>,
): Promise<void> {
  switch (event.type) {
    case 'order.created':
      // Notify the chef
      await queue.add('send-notification', {
        channel: 'email',
        template: 'new-order-chef',
        userId: event.chefId,
        notificationId: crypto.randomUUID(),
        data: { orderId: event.orderId, items: event.items, totalAmount: event.totalAmount },
      })
      await queue.add('send-notification', {
        channel: 'push',
        template: 'new-order',
        userId: event.chefId,
        notificationId: crypto.randomUUID(),
        data: { orderId: event.orderId },
      })
      // Confirm to user
      await queue.add('send-notification', {
        channel: 'email',
        template: 'order-confirmed-user',
        userId: event.userId,
        notificationId: crypto.randomUUID(),
        data: { orderId: event.orderId, items: event.items, totalAmount: event.totalAmount },
      })
      break

    case 'order.status_changed':
      // order.status_changed does not carry userId — the worker resolves the
      // recipient from the orderId via an order-service lookup.
      await queue.add('send-notification', {
        channel: 'push',
        template: 'status-update',
        userId: event.orderId, // resolved by worker via order lookup
        notificationId: crypto.randomUUID(),
        data: { orderId: event.orderId, newStatus: event.newStatus },
      })
      break

    case 'order.completed':
      await queue.add('send-notification', {
        channel: 'push',
        template: 'leave-review',
        userId: event.userId,
        notificationId: crypto.randomUUID(),
        data: { orderId: event.orderId, chefId: event.chefId },
      })
      await queue.add('send-notification', {
        channel: 'email',
        template: 'leave-review',
        userId: event.userId,
        notificationId: crypto.randomUUID(),
        data: { orderId: event.orderId },
      })
      break

    case 'order.cancelled':
      await queue.add('send-notification', {
        channel: 'email',
        template: 'order-cancelled',
        userId: event.userId,
        notificationId: crypto.randomUUID(),
        data: { orderId: event.orderId, reason: event.reason },
      })
      await queue.add('send-notification', {
        channel: 'email',
        template: 'order-cancelled',
        userId: event.chefId,
        notificationId: crypto.randomUUID(),
        data: { orderId: event.orderId, reason: event.reason },
      })
      break

    case 'refund.issued':
      // refund.issued does not carry userId — the worker resolves the
      // recipient from the orderId via an order-service lookup.
      await queue.add('send-notification', {
        channel: 'email',
        template: 'refund-issued',
        userId: event.orderId, // resolved by worker
        notificationId: crypto.randomUUID(),
        data: { orderId: event.orderId, amount: event.amount },
      })
      break

    default:
      break
  }
}
