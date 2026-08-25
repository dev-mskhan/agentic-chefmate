import { test, expect } from '@playwright/test'
import { Kafka, type Producer } from 'kafkajs'
import { setupUser, uniqueEmail, utrpcPost } from '../../helpers/user'

let producer: Producer

test.setTimeout(120_000)

test.beforeAll(async () => {
  const kafka = new Kafka({
    clientId: `journey5-${process.pid}`,
    brokers: [process.env.REDPANDA_BROKER ?? 'localhost:9092'],
  })
  producer = kafka.producer()
  await producer.connect()
})

test.afterAll(async () => {
  await producer.disconnect()
})

test('Journey 5 — order event persists notification, increments unread count, and supports read state', async ({ request }) => {
  const user = await setupUser(request, uniqueEmail('journey5'))
  const preferences = await utrpcPost(request, 'updateNotifPrefs', { channels: { inApp: true } })
  expect(preferences.status).toBe(200)
  const orderId = `order-journey5-${Date.now()}`
  const eventId = `event-journey5-${Date.now()}`

  await producer.send({
    topic: 'order.events',
    messages: [{
      key: user.userId,
      value: JSON.stringify({
        type: 'order.status_changed',
        eventId,
        orderId,
        userId: user.userId,
        chefId: `chef-${Date.now()}`,
        oldStatus: 'CONFIRMED',
        newStatus: 'READY',
        createdAt: new Date().toISOString(),
        version: '1',
      }),
    }],
  })

  await expect.poll(async () => {
    const response = await request.get('/api/v1/notifications?limit=100')
    expect(response.status()).toBe(200)
    const body = await response.json()
    return body.notifications.find((item: any) => item.data?.orderId === orderId)
  }, { timeout: 30_000 }).toBeTruthy()

  const notificationsResponse = await request.get('/api/v1/notifications?limit=100')
  const notifications = (await notificationsResponse.json()).notifications
  const persisted = notifications.find((item: any) => item.data?.orderId === orderId)
  expect(persisted).toBeTruthy()
  await expect.poll(async () => {
    const response = await request.get('/api/v1/notifications?limit=100')
    const current = (await response.json()).notifications.find((item: any) => item.data?.orderId === orderId)
    return current?.channelStatus.inApp.status
  }, { timeout: 30_000 }).toBe('delivered')

  const deliveredResponse = await request.get('/api/v1/notifications?limit=100')
  const delivered = (await deliveredResponse.json()).notifications.find((item: any) => item.data?.orderId === orderId)
  expect(delivered.channelStatus.inApp.unread).toBe(true)

  const unread = await request.get('/api/v1/notifications/unread-count')
  expect(unread.status()).toBe(200)
  expect((await unread.json()).count).toBeGreaterThan(0)

  const markRead = await request.post(`/api/v1/notifications/${persisted._id}/read`, { data: {} })
  expect(markRead.status(), await markRead.text()).toBe(200)

  await expect.poll(async () => {
    const response = await request.get('/api/v1/notifications/unread-count')
    return (await response.json()).count
  }, { timeout: 10_000 }).toBe(0)
})
