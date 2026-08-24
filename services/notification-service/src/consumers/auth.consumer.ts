import type { Queue } from 'bullmq'
import { isEventProcessed, markEventProcessed } from '@chefmate/event-contracts'
import type { AuthEvent } from '@chefmate/event-contracts'
import type { NotificationJob } from '../queues/notification.queue'
import { deriveNotificationId } from '../utils/idempotency'
import { getEmailQueue, getInAppQueue } from '../queues/notification.queue'

export async function handleAuthEvent(event: AuthEvent): Promise<void> {
  const eventId = (event as AuthEvent & { eventId: string }).eventId
  if (await isEventProcessed(eventId)) return
  const emailQueue = getEmailQueue()
  const inappQueue = getInAppQueue()

  switch (event.type) {
    case 'user.registered': {
      // Only local provider has a verifyUrl — google providers are already verified
      if (event.provider !== 'local') break
      const notificationId = deriveNotificationId('user.registered', event.userId)
      await emailQueue.add(
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
      // Include createdAt so each reset request gets a unique jobId.
      // Without this, a second request from the same user would be silently
      // dropped by BullMQ's deduplication since the completed job from the
      // first request is still in Redis.
      const notificationId = deriveNotificationId(
        'user.password_reset_requested',
        event.userId,
        event.createdAt,
      )
      await emailQueue.add(
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
        const email = event.email

        const emailId = deriveNotificationId('user.role_changed', event.userId, 'email')
        const inappId = deriveNotificationId('user.role_changed', event.userId, 'inapp')

        await emailQueue.add(
          'send-notification',
          {
            channel: 'email',
            template: 'welcome-chef',
            userId: event.userId,
            notificationId: emailId,
            data: { email },
          },
          { jobId: emailId },
        )

        await inappQueue.add(
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
  await markEventProcessed(eventId)
}
