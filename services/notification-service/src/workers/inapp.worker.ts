import { Worker } from 'bullmq'
import type { Redis } from 'ioredis'
import { createLogger } from '@chefmate/logger'
import type { NotificationJob } from '../queues/notification.queue'
import { getBullMQConnection } from '../queues/redis-connection'
import { Notification } from '../models/notification.model'
import type { NotificationType } from '../models/notification.model'
import { config } from '../config'

const logger = createLogger('notification-inapp-worker').child({ instanceId: config.INSTANCE_ID })

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
  'payment-confirmed': {
    type:    'ORDER_ACCEPTED',
    title:   'Payment Confirmed',
    message: (d) => `Your payment for order #${String(d['orderId'] ?? '').slice(-8).toUpperCase()} was successful`,
  },
  'payment-failed': {
    type:    'ORDER_CANCELLED',
    title:   'Payment Failed',
    message: (d) => `Payment failed for order #${String(d['orderId'] ?? '').slice(-8).toUpperCase()}. Please retry.`,
  },
  'refund-issued': {
    type:    'ORDER_DELIVERED',
    title:   'Refund Issued',
    message: (d) => `A refund has been issued for order #${String(d['orderId'] ?? '').slice(-8).toUpperCase()}`,
  },
  'subscription-activated': {
    type:    'ORDER_ACCEPTED',
    title:   'Subscription Active!',
    message: () => 'Your meal plan subscription is now active',
  },
  'subscription-paused': {
    type:    'ORDER_CANCELLED',
    title:   'Subscription Paused',
    message: () => 'Your subscription has been paused',
  },
  'subscription-resumed': {
    type:    'ORDER_ACCEPTED',
    title:   'Subscription Resumed',
    message: (d) => `Your subscription has resumed. Next billing: ${String(d['nextBillingDate'] ?? '')}`,
  },
  'subscription-cancelled': {
    type:    'ORDER_CANCELLED',
    title:   'Subscription Cancelled',
    message: () => 'Your meal plan subscription has been cancelled',
  },
  'subscription-past-due': {
    type:    'ORDER_CANCELLED',
    title:   'Payment Failed',
    message: () => 'Your subscription payment failed. Please update your payment method.',
  },
  'subscription-order-created': {
    type:    'ORDER_ACCEPTED',
    title:   'Recurring Order Created',
    message: (d) => `Your subscription order #${String(d['orderId'] ?? '').slice(-8).toUpperCase()} is being prepared`,
  },
  'subscription-skipped': {
    type:    'ORDER_DELIVERED',
    title:   'Delivery Skipped',
    message: (d) => `Your delivery for ${String(d['skippedPeriod'] ?? '')} has been skipped`,
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

      const saved = await Notification.findOne({ userId, 'data.notificationId': notificationId })
      if (!saved) {
        throw new Error(`Notification ${notificationId} was not persisted before in-app delivery`)
      }

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
      await Notification.updateOne(
        { userId, 'data.notificationId': notificationId },
        { $set: { 'channelStatus.inApp.status': 'delivered', 'channelStatus.inApp.sentAt': new Date() } },
      )
      logger.info({ channel, template, notificationId }, 'In-app notification published')
    },
    {
      connection:  getBullMQConnection(),
      concurrency: 50,
    },
  )
}
