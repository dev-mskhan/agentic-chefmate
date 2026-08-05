import type { Queue } from 'bullmq'
import type { AuthEvent } from '@chefmate/event-contracts'
import type { NotificationJob } from '../queues/notification.queue'
import crypto from 'crypto'

export async function handleAuthEvent(
  event: AuthEvent,
  queue: Queue<NotificationJob>,
): Promise<void> {
  switch (event.type) {
    case 'user.registered':
      await queue.add('send-notification', {
        channel: 'email',
        template: 'verify-email',
        userId: event.userId,
        notificationId: crypto.randomUUID(),
        data: { email: event.email, provider: event.provider },
      })
      break

    case 'user.role_changed':
      if (event.newRole === 'CHEF') {
        await queue.add('send-notification', {
          channel: 'email',
          template: 'welcome-chef',
          userId: event.userId,
          notificationId: crypto.randomUUID(),
          data: {},
        })
        await queue.add('send-notification', {
          channel: 'push',
          template: 'welcome-chef',
          userId: event.userId,
          notificationId: crypto.randomUUID(),
          data: {},
        })
      }
      break

    default:
      break
  }
}
