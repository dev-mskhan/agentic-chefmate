import { Worker } from 'bullmq'
import type { Redis } from 'ioredis'
import { createLogger } from '@chefmate/logger'
import type { NotificationJob } from '../queues/notification.queue'
import { getBullMQConnection } from '../queues/redis-connection'
import { persistNotification } from '../services/notification.service'
import type { NotificationType } from '../models/notification.model'

const logger = createLogger('notification-inapp-worker')

// ── Template registry ─────────────────────────────────────────────────────────
// Centralised map instead of giant switch statements in each function.
// Adding a new template = add one entry here, no worker logic changes.

interface InAppTemplate {
  type: NotificationType
  title: string | ((data: Record<string, unknown>) => string)
  message: (data: Record<string, unknown>) => string
}

const INAPP_TEMPLATES: Record<string, InAppTemplate> = {
  'new-order': {
    type:    'ORDER_ACCEPTED',
    title:   'New Order Received',
    message: (d) => `You have a new order #${String(d['orderId'] ?? '')}`,
  },
  'new-order-chef': {
    type:    'ORDER_ACCEPTED',
    title:   'New Order Received',
    message: (d) => `You have a new order #${String(d['orderId'] ?? '')}`,
  },
  'status-update': {
    type:    'ORDER_READY',
    title:   (d) => `Order ${String(d['newStatus'] ?? 'Updated')}`,
    message: (d) => `Your order status changed to ${String(d['newStatus'] ?? '')}`,
  },
  'order-cancelled': {
    type:    'ORDER_CANCELLED',
    title:   'Order Cancelled',
    message: (d) => `Order #${String(d['orderId'] ?? '')} has been cancelled`,
  },
  'leave-review': {
    type:    'ORDER_DELIVERED',
    title:   'How was your meal?',
    message: () => 'Please leave a review for your recent order',
  },
  'chef-approved': {
    type:    'CHEF_APPROVED',
    title:   'Your chef application has been approved!',
    message: () => 'Congratulations! You can now start receiving orders.',
  },
  'account-suspended': {
    type:    'CHEF_SUSPENDED',
    title:   'Account Suspended',
    message: (d) =>
      `Your account has been suspended${d['reason'] ? `: ${String(d['reason'])}` : ''}`,
  },
  'chef-approval-pending': {
    type:    'CHEF_APPROVED',
    title:   'Chef Approval Required',
    message: (d) => `Chef ${String(d['chefId'] ?? '')} is awaiting approval`,
  },
  'unread-message': {
    type:    'CHAT_MESSAGE',
    title:   'New Message',
    message: () => 'You have an unread message',
  },
  'welcome-chef': {
    type:    'WELCOME_CHEF',
    title:   'Welcome to ChefMate!',
    message: () => 'Your chef profile is set up. Start accepting orders!',
  },
}

function resolveTemplate(
  templateKey: string,
  data: Record<string, unknown>,
): { type: NotificationType; title: string; message: string } {
  const tmpl = INAPP_TEMPLATES[templateKey]
  if (!tmpl) {
    // Graceful fallback — don't hard-fail on unknown templates
    return {
      type:    'CHAT_MESSAGE',
      title:   'Notification',
      message: 'You have a new notification',
    }
  }
  return {
    type:    tmpl.type,
    title:   typeof tmpl.title === 'function' ? tmpl.title(data) : tmpl.title,
    message: tmpl.message(data),
  }
}

// ── Worker ────────────────────────────────────────────────────────────────────

export function startInAppWorker(pubClient: Redis): Worker<NotificationJob> {
  return new Worker<NotificationJob>(
    'notifications-inapp',
    async (job) => {
      const { userId, template, data, notificationId } = job.data

      const { type, title, message } = resolveTemplate(template, data)

      // Persist to MongoDB so reconnecting users can fetch missed notifications
      const saved = await persistNotification(userId, type, title, message, data)

      // Publish to Redis pub/sub for real-time delivery
      // Channel: notif:user:{userId} — subscribed by the gateway/chat-service
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
      connection:  getBullMQConnection(),
      concurrency: 50,
    },
  )
}
