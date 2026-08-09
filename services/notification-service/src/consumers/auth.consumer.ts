import type { Queue } from 'bullmq'
import type { AuthEvent } from '@chefmate/event-contracts'
import type { NotificationJob } from '../queues/notification.queue'
import { deriveNotificationId } from '../utils/idempotency'

export async function handleAuthEvent(
  event: AuthEvent,
  queue: Queue<NotificationJob>,
): Promise<void> {
  switch (event.type) {
    case 'user.registered': {
      // Only local provider has a verifyUrl — google providers are already verified
      if (event.provider !== 'local') break
      const notificationId = deriveNotificationId('user.registered', event.userId)
      await queue.add(
        'send-notification',
        {
          channel: 'email',
          template: 'verify-email',
          userId: event.userId,
          notificationId,
          data: {
            email: event.email,
            provider: event.provider,
            verifyUrl: (event as { verifyUrl?: string }).verifyUrl ?? '',
          },
        },
        { jobId: notificationId },
      )
      break
    }

    case 'user.password_reset_requested': {
      const notificationId = deriveNotificationId('user.password_reset_requested', event.userId)
      await queue.add(
        'send-notification',
        {
          channel: 'email',
          template: 'reset-password',
          userId: event.userId,
          notificationId,
          data: {
            email: event.email,
            resetUrl: event.resetUrl,
          },
        },
        { jobId: notificationId },
      )
      break
    }

    case 'user.role_changed': {
      if (event.newRole === 'CHEF') {
        const emailId = deriveNotificationId('user.role_changed', event.userId, 'email')
        const inappId = deriveNotificationId('user.role_changed', event.userId, 'inapp')

        // Email notification
        await queue.add(
          'send-notification',
          {
            channel: 'email',
            template: 'welcome-chef',
            userId: event.userId,
            notificationId: emailId,
            data: {},
          },
          { jobId: emailId },
        )

        // In-app notification (persisted to MongoDB for history)
        await queue.add(
          'send-notification',
          {
            channel: 'inapp',
            template: 'welcome-chef',
            userId: event.userId,
            notificationId: inappId,
            data: {},
          },
          { jobId: inappId },
        )
      }
      break
    }

    default:
      break
  }
}
