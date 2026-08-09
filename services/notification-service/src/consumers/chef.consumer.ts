import type { Queue } from 'bullmq'
import type { ChefEvent } from '@chefmate/event-contracts'
import type { NotificationJob } from '../queues/notification.queue'
import { deriveNotificationId } from '../utils/idempotency'

export async function handleChefEvent(
  event: ChefEvent,
  queue: Queue<NotificationJob>,
): Promise<void> {
  switch (event.type) {
    case 'chef.approved': {
      // email + push + inapp (chef)
      const emailId = deriveNotificationId('chef.approved', event.chefId, 'email')
      const pushId  = deriveNotificationId('chef.approved', event.chefId, 'push')
      const inappId = deriveNotificationId('chef.approved', event.chefId, 'inapp')

      await queue.add(
        'send-notification',
        {
          channel: 'email',
          template: 'chef-approved',
          userId: event.chefId,
          notificationId: emailId,
          data: {},
        },
        { jobId: emailId },
      )

      await queue.add(
        'send-notification',
        {
          channel: 'push',
          template: 'chef-approved',
          userId: event.chefId,
          notificationId: pushId,
          data: {},
        },
        { jobId: pushId },
      )

      await queue.add(
        'send-notification',
        {
          channel: 'inapp',
          template: 'chef-approved',
          userId: event.chefId,
          notificationId: inappId,
          data: {},
        },
        { jobId: inappId },
      )
      break
    }

    case 'chef.suspended': {
      // email + inapp (chef)
      const emailId = deriveNotificationId('chef.suspended', event.chefId, 'email')
      const inappId = deriveNotificationId('chef.suspended', event.chefId, 'inapp')

      await queue.add(
        'send-notification',
        {
          channel: 'email',
          template: 'account-suspended',
          userId: event.chefId,
          notificationId: emailId,
          data: { reason: event.reason },
        },
        { jobId: emailId },
      )

      await queue.add(
        'send-notification',
        {
          channel: 'inapp',
          template: 'account-suspended',
          userId: event.chefId,
          notificationId: inappId,
          data: { reason: event.reason },
        },
        { jobId: inappId },
      )
      break
    }

    case 'chef.approval_pending': {
      // inapp only — notify admins
      const inappId = deriveNotificationId('chef.approval_pending', event.chefId, 'inapp')
      await queue.add(
        'send-notification',
        {
          channel: 'inapp',
          template: 'chef-approval-pending',
          userId: 'admin', // broadcast to admin channel
          notificationId: inappId,
          data: { chefId: event.chefId },
        },
        { jobId: inappId },
      )
      break
    }

    default:
      break
  }
}
