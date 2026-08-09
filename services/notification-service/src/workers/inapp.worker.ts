import { Worker } from 'bullmq'
import type { Redis } from 'ioredis'
import { createLogger } from '@chefmate/logger'
import type { NotificationJob } from '../queues/notification.queue'
import { getBullMQConnection } from '../queues/redis-connection'
import { persistNotification } from '../services/notification.service'
import type { NotificationType } from '../models/notification.model'

const logger = createLogger('notification-inapp-worker')

/** Map BullMQ template names to stored NotificationType values */
function templateToNotificationType(template: string): NotificationType {
  const map: Record<string, NotificationType> = {
    'new-order':             'ORDER_ACCEPTED',
    'new-order-chef':        'ORDER_ACCEPTED',
    'status-update':         'ORDER_READY',
    'order-cancelled':       'ORDER_CANCELLED',
    'leave-review':          'ORDER_DELIVERED',
    'chef-approved':         'CHEF_APPROVED',
    'account-suspended':     'CHEF_SUSPENDED',
    'chef-approval-pending': 'CHEF_APPROVED',
    'unread-message':        'CHAT_MESSAGE',
    'welcome-chef':          'WELCOME_CHEF',
  }
  return map[template] ?? 'CHAT_MESSAGE'
}

/** Build a human-readable title from the template name */
function buildTitle(template: string, data: Record<string, unknown>): string {
  switch (template) {
    case 'new-order':
    case 'new-order-chef':
      return 'New Order Received'
    case 'status-update':
      return `Order ${(data['newStatus'] as string | undefined) ?? 'Updated'}`
    case 'order-cancelled':
      return 'Order Cancelled'
    case 'leave-review':
      return 'How was your meal?'
    case 'chef-approved':
      return 'Your chef application has been approved!'
    case 'account-suspended':
      return 'Account Suspended'
    case 'chef-approval-pending':
      return 'Chef Approval Required'
    case 'unread-message':
      return 'New Message'
    case 'welcome-chef':
      return 'Welcome to ChefMate!'
    default:
      return 'Notification'
  }
}

/** Build a short message body from the template name and data */
function buildMessage(template: string, data: Record<string, unknown>): string {
  switch (template) {
    case 'new-order':
    case 'new-order-chef':
      return `You have a new order #${(data['orderId'] as string | undefined) ?? ''}`
    case 'status-update':
      return `Your order status changed to ${(data['newStatus'] as string | undefined) ?? ''}`
    case 'order-cancelled':
      return `Order #${(data['orderId'] as string | undefined) ?? ''} has been cancelled`
    case 'leave-review':
      return `Please leave a review for your recent order`
    case 'chef-approved':
      return 'Congratulations! You can now start receiving orders.'
    case 'account-suspended':
      return `Your account has been suspended${data['reason'] ? `: ${data['reason'] as string}` : ''}`
    case 'chef-approval-pending':
      return `Chef ${(data['chefId'] as string | undefined) ?? ''} is awaiting approval`
    case 'unread-message':
      return 'You have an unread message'
    case 'welcome-chef':
      return 'Your chef profile is set up. Start accepting orders!'
    default:
      return 'You have a new notification'
  }
}

export function startInAppWorker(pubClient: Redis): Worker<NotificationJob> {
  return new Worker<NotificationJob>(
    'notifications',
    async (job) => {
      if (job.data.channel !== 'inapp') return

      const { userId, template, data, notificationId } = job.data

      const title = buildTitle(template, data)
      const message = buildMessage(template, data)
      const type = templateToNotificationType(template)

      // Persist to MongoDB so reconnecting users can fetch missed notifications
      const saved = await persistNotification(userId, type, title, message, data)

      // Publish enriched payload to Redis pub/sub for real-time delivery
      // Channel: notif:user:{userId} (the chat-service / gateway subscribes and forwards)
      const channel = `notif:user:${userId}`
      const payload = JSON.stringify({
        notificationId,
        mongoId: (saved._id as { toString(): string }).toString(),
        template,
        title,
        message,
        data,
        sentAt: new Date().toISOString(),
      })

      await pubClient.publish(channel, payload)
      logger.info({ channel, template, notificationId }, 'In-app notification published')
    },
    {
      connection: getBullMQConnection(),
      concurrency: 50,
    },
  )
}
