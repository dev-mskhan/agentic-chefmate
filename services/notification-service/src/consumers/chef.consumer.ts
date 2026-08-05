import type { Queue } from 'bullmq'
import type { ChefEvent } from '@chefmate/event-contracts'
import type { NotificationJob } from '../queues/notification.queue'
import crypto from 'crypto'

export async function handleChefEvent(
  event: ChefEvent,
  queue: Queue<NotificationJob>,
): Promise<void> {
  switch (event.type) {
    case 'chef.approved':
      await queue.add('send-notification', {
        channel: 'email',
        template: 'chef-approved',
        userId: event.chefId,
        notificationId: crypto.randomUUID(),
        data: {},
      })
      await queue.add('send-notification', {
        channel: 'push',
        template: 'chef-approved',
        userId: event.chefId,
        notificationId: crypto.randomUUID(),
        data: {},
      })
      break

    case 'chef.suspended':
      await queue.add('send-notification', {
        channel: 'email',
        template: 'account-suspended',
        userId: event.chefId,
        notificationId: crypto.randomUUID(),
        data: { reason: event.reason },
      })
      break

    case 'chef.approval_pending':
      // Notify admins via in-app
      await queue.add('send-notification', {
        channel: 'inapp',
        template: 'chef-approval-pending',
        userId: 'admin', // broadcast to admin channel
        notificationId: crypto.randomUUID(),
        data: { chefId: event.chefId },
      })
      break

    default:
      break
  }
}
