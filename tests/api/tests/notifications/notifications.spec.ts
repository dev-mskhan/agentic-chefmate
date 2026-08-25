import { test, expect, type APIRequestContext } from '@playwright/test'
import { Kafka, type Producer } from 'kafkajs'
import crypto from 'node:crypto'
import { setupUser, uniqueEmail, STRONG_PASSWORD, utrpcPost } from '../../helpers/user'

const CHAT_TOPIC = 'chat.events'
const AUTH_TOPIC = 'auth.events'

let producer: Producer

async function publish(topic: string, event: Record<string, unknown>): Promise<void> {
  await producer.send({
    topic,
    messages: [{ key: String(event['recipientId'] ?? event['userId'] ?? event['type']), value: JSON.stringify(event) }],
  })
}

function notificationId(eventType: string, ...parts: string[]): string {
  const normalized = ['email', 'push', 'inapp'].includes(parts.at(-1) ?? '')
    ? parts.slice(0, -1)
    : parts
  return crypto.createHash('sha256').update([eventType, ...normalized].join(':')).digest('hex').slice(0, 32)
}

async function listNotifications(request: APIRequestContext): Promise<any[]> {
  const response = await request.get('/api/v1/notifications?limit=100')
  expect(response.status()).toBe(200)
  return (await response.json()).notifications
}

async function waitFor(
  read: () => Promise<any[]>,
  predicate: (value: any[]) => boolean,
  timeoutMs = 20_000,
): Promise<any[]> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const value = await read()
    if (predicate(value)) return value
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  return read()
}

test.beforeAll(async () => {
  const kafka = new Kafka({
    clientId: `notification-playwright-${process.pid}`,
    brokers: [process.env['REDPANDA_BROKER'] ?? 'localhost:9092'],
  })
  producer = kafka.producer()
  await producer.connect()
})

test.afterAll(async () => {
  await producer.disconnect()
})

test.describe('Phase 10 — notification pipeline through gateway', () => {
  test('persists and delivers a successful in-app notification with the selected template', async ({ request }) => {
    const user = await setupUser(request, uniqueEmail('notification-success'))
    const eventId = `e2e-success-${Date.now()}`
    const messageId = `message-${eventId}`

    await publish(CHAT_TOPIC, {
      type: 'chat.message_unread',
      eventId,
      recipientId: user.userId,
      messageId,
      threadId: `thread-${eventId}`,
      senderId: `sender-${eventId}`,
      createdAt: new Date().toISOString(),
      version: '1',
    })

    const notifications = await waitFor(
      () => listNotifications(request),
      (items) => items.some((item) =>
        item.data?.notificationId === notificationId('chat.message_unread', messageId, 'inapp') &&
        item.channelStatus?.inApp?.status === 'delivered',
      ),
    )
    const notification = notifications.find((item) => item.data?.notificationId === notificationId('chat.message_unread', messageId, 'inapp'))

    expect(notification).toBeTruthy()
    expect(notification.channelStatus.inApp.status).toBe('delivered')
    expect(notification.channelStatus.inApp.unread).toBe(true)
    expect(notification.message).toContain('unread')
  })

  test('persists a skipped channel when the user disables in-app notifications', async ({ request }) => {
    const user = await setupUser(request, uniqueEmail('notification-disabled'))
    const update = await utrpcPost(request, 'updateNotifPrefs', { channels: { inApp: false } })
    expect(update.status).toBe(200)
    const eventId = `e2e-disabled-${Date.now()}`
    const messageId = `message-${eventId}`

    await publish(CHAT_TOPIC, {
      type: 'chat.message_unread',
      eventId,
      recipientId: user.userId,
      messageId,
      threadId: `thread-${eventId}`,
      senderId: `sender-${eventId}`,
      createdAt: new Date().toISOString(),
      version: '1',
    })

    const notifications = await waitFor(
      () => listNotifications(request),
      (items) => items.some((item) =>
        item.data?.notificationId === notificationId('chat.message_unread', messageId, 'inapp') &&
        item.channelStatus?.inApp?.status === 'skipped',
      ),
    )
    const notification = notifications.find((item) => item.data?.notificationId === notificationId('chat.message_unread', messageId, 'inapp'))
    expect(notification.channelStatus.inApp.status).toBe('skipped')
    expect(notification.channelStatus.inApp.unread).not.toBe(true)
  })

  test('does not create duplicate persistence for a redelivered event', async ({ request }) => {
    const user = await setupUser(request, uniqueEmail('notification-duplicate'))
    const eventId = `e2e-duplicate-${Date.now()}`
    const messageId = `message-${eventId}`
    const event = {
      type: 'chat.message_unread',
      eventId,
      recipientId: user.userId,
      messageId,
      threadId: `thread-${eventId}`,
      senderId: `sender-${eventId}`,
      createdAt: new Date().toISOString(),
      version: '1',
    }

    await publish(CHAT_TOPIC, event)
    await publish(CHAT_TOPIC, event)

    const notifications = await waitFor(
      () => listNotifications(request),
      (items) => items.filter((item) => item.data?.notificationId === notificationId('chat.message_unread', messageId, 'inapp')).length >= 1,
    )
    expect(notifications.filter((item) => item.data?.notificationId === notificationId('chat.message_unread', messageId, 'inapp'))).toHaveLength(1)
  })

  test('retries a failed email and records the final failure in the admin DLQ', async ({ request }) => {
    test.setTimeout(70_000)
    const admin = await request.post('/api/v1/auth/trpc/signin', {
      data: { email: 'admin@chefmate.test', password: 'AdminPass123!' },
    })
    expect(admin.status()).toBe(200)
    const me = await request.get('/api/v1/auth/trpc/me')
    const adminUserId = (await me.json()).result.data.userId
    const eventId = `e2e-dlq-${Date.now()}`
    const failedNotificationId = notificationId('user.registered', adminUserId)

    await publish(AUTH_TOPIC, {
      type: 'user.registered',
      eventId,
      userId: adminUserId,
      email: 'invalid recipient',
      role: 'USER',
      provider: 'local',
      verifyUrl: 'http://localhost/verify?token=test',
      createdAt: new Date().toISOString(),
      version: '1',
    })

    const response = await waitFor(
      async () => {
          const result = await request.get(`/api/v1/notifications/dlq?notificationId=${encodeURIComponent(failedNotificationId)}`)
        return (await result.json()).entries ?? []
      },
      (entries) => entries.some((entry) => entry.notificationId === failedNotificationId),
      60_000,
    )
    expect(response.some((entry) => entry.notificationId === failedNotificationId)).toBe(true)
  })
})
