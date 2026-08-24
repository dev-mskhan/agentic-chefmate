import { test, expect } from '@playwright/test'
import {
  createChatOrderFixture,
  setupChatChef,
  setupChatCustomer,
  connectSocket,
  getThreadHttp,
  getMyThreadsHttp,
  listMessagesHttp,
  getUnreadCountHttp,
  ChatOrderFixture,
} from '../../helpers/chat'
import { Socket } from 'socket.io-client'

test.describe('Phase 9 — Chat Service (via Gateway)', () => {
  let fixture: ChatOrderFixture

  test.beforeAll(async () => {
    fixture = await createChatOrderFixture()
  })

  // ── 9A: Thread Management & Authorization ──────────────────────────────────

  test('9A-1: customer can create/get thread for completed/placed order (200)', async () => {
    const res = await getThreadHttp(fixture.customer.request, fixture.orderId)
    expect(res.status).toBe(200)

    const thread = res.body.data ?? res.body
    expect(thread.orderId).toBe(fixture.orderId)
    expect(thread.customerId).toBe(fixture.customer.userId)
    expect(thread.chefId).toBe(fixture.chef.chefId)
  })

  test('9A-2: chef can get thread for their order (200)', async () => {
    const res = await getThreadHttp(fixture.chef.request, fixture.orderId)
    expect(res.status).toBe(200)

    const thread = res.body.data ?? res.body
    expect(thread.orderId).toBe(fixture.orderId)
  })

  test('9A-3: non-participant customer cannot access thread for an order (403)', async () => {
    const stranger = await setupChatCustomer()
    const res = await getThreadHttp(stranger.request, fixture.orderId)
    expect(res.status).toBe(403)
  })

  test('9A-4: get thread for non-existent order returns 404', async () => {
    const fakeOrderId = '60d5ec49f1b2c80015f8d999'
    const res = await getThreadHttp(fixture.customer.request, fakeOrderId)
    expect(res.status).toBe(404)
  })

  test('9A-5: customer can list their threads (200)', async () => {
    const res = await getMyThreadsHttp(fixture.customer.request)
    expect(res.status).toBe(200)

    const data = res.body.data ?? res.body
    expect(Array.isArray(data.threads)).toBe(true)
    expect(data.threads.length).toBeGreaterThan(0)
    expect(data.threads[0].customerId).toBe(fixture.customer.userId)
  })

  test('9A-6: chef can list their threads (200)', async () => {
    const res = await getMyThreadsHttp(fixture.chef.request)
    expect(res.status).toBe(200)

    const data = res.body.data ?? res.body
    expect(Array.isArray(data.threads)).toBe(true)
    expect(data.threads.length).toBeGreaterThan(0)
    expect(data.threads[0].chefId).toBe(fixture.chef.chefId)
  })

  // ── 9B: Real-Time Socket Connection & Messaging ──────────────────────────

  test('9B-1: socket connection with valid JWT token succeeds', async () => {
    const socket = await connectSocket('http://localhost:3000', fixture.customer.token)
    expect(socket.connected).toBe(true)
    socket.disconnect()
  })

  test('9B-2: socket connection with missing/invalid token fails', async () => {
    await expect(connectSocket('http://localhost:3000', 'invalid.jwt.token')).rejects.toThrow()
  })

  test('9B-3: customer sends message via socket and chef receives message:new event real-time', async () => {
    const custSocket = await connectSocket('http://localhost:3000', fixture.customer.token)
    const chefSocket = await connectSocket('http://localhost:3000', fixture.chef.token)

    // Both join thread room
    custSocket.emit('joinThread', { orderId: fixture.orderId })
    chefSocket.emit('joinThread', { orderId: fixture.orderId })

    // Wait 500ms for room join
    await new Promise((r) => setTimeout(r, 500))

    const testMessageContent = 'Hello chef! Is my order ready?'

    // Set listener on chef socket
    const messagePromise = new Promise<any>((resolve) => {
      chefSocket.on('message:new', (msg) => {
        resolve(msg)
      })
    })

    // Customer sends message
    custSocket.emit('sendMessage', {
      orderId: fixture.orderId,
      content: testMessageContent,
    })

    const receivedMessage = await messagePromise
    expect(receivedMessage.content).toBe(testMessageContent)
    expect(receivedMessage.senderId).toBe(fixture.customer.userId)
    expect(receivedMessage.senderRole).toBe('USER')
    expect(receivedMessage.orderId).toBe(fixture.orderId)

    custSocket.disconnect()
    chefSocket.disconnect()
  })

  test('9B-4: clientMessageId idempotency avoids duplicate message creation', async () => {
    const custSocket = await connectSocket('http://localhost:3000', fixture.customer.token)
    custSocket.emit('joinThread', { orderId: fixture.orderId })
    await new Promise((r) => setTimeout(r, 300))

    const clientMsgId = `client_msg_${Date.now()}`

    const msg1Promise = new Promise<any>((resolve) => {
      custSocket.once('message:new', resolve)
    })

    custSocket.emit('sendMessage', {
      orderId: fixture.orderId,
      content: 'Idempotent test message',
      clientMessageId: clientMsgId,
    })

    const msg1 = await msg1Promise

    // Send duplicate clientMessageId
    const msg2Promise = new Promise<any>((resolve) => {
      custSocket.once('message:new', resolve)
    })

    custSocket.emit('sendMessage', {
      orderId: fixture.orderId,
      content: 'Idempotent test message (duplicate)',
      clientMessageId: clientMsgId,
    })

    const msg2 = await msg2Promise
    expect(msg2._id).toBe(msg1._id)

    custSocket.disconnect()
  })

  test('9B-5: content exceeding 2000 chars emits error event', async () => {
    const custSocket = await connectSocket('http://localhost:3000', fixture.customer.token)

    const errorPromise = new Promise<string>((resolve) => {
      custSocket.on('error', (err) => resolve(err))
    })

    custSocket.emit('sendMessage', {
      orderId: fixture.orderId,
      content: 'a'.repeat(2001),
    })

    const err = await errorPromise
    expect(err).toContain('exceeds 2000')

    custSocket.disconnect()
  })

  test('9B-6: non-participant socket receives error when attempting to send message', async () => {
    const stranger = await setupChatCustomer()
    const strangerSocket = await connectSocket('http://localhost:3000', stranger.token)

    const errorPromise = new Promise<string>((resolve) => {
      strangerSocket.on('error', (err) => resolve(err))
    })

    strangerSocket.emit('sendMessage', {
      orderId: fixture.orderId,
      content: 'Unauthorized intrusion attempt',
    })

    const err = await errorPromise
    expect(err).toBe('Not a participant')

    strangerSocket.disconnect()
  })

  // ── 9C: Read Receipts & Unread Counts ─────────────────────────────────────

  test('9C-1: message sent by customer increments chef unread count', async () => {
    // Get threadId first
    const threadRes = await getThreadHttp(fixture.customer.request, fixture.orderId)
    const thread = threadRes.body.data ?? threadRes.body
    const threadId = thread._id

    const custSocket = await connectSocket('http://localhost:3000', fixture.customer.token)
    custSocket.emit('sendMessage', {
      orderId: fixture.orderId,
      content: 'Unread counter increment test',
    })

    // Wait 500ms for db update
    await new Promise((r) => setTimeout(r, 500))

    const unreadRes = await getUnreadCountHttp(fixture.chef.request, threadId)
    expect(unreadRes.status).toBe(200)
    const unreadData = unreadRes.body.data ?? unreadRes.body
    expect(unreadData.unreadCount).toBeGreaterThan(0)

    custSocket.disconnect()
  })

  test('9C-2: markMessagesRead resets unread count and emits message:read event to sender', async () => {
    const threadRes = await getThreadHttp(fixture.customer.request, fixture.orderId)
    const thread = threadRes.body.data ?? threadRes.body
    const threadId = thread._id

    const custSocket = await connectSocket('http://localhost:3000', fixture.customer.token)
    const chefSocket = await connectSocket('http://localhost:3000', fixture.chef.token)

    custSocket.emit('joinThread', { orderId: fixture.orderId })
    chefSocket.emit('joinThread', { orderId: fixture.orderId })
    await new Promise((r) => setTimeout(r, 300))

    const readReceiptPromise = new Promise<any>((resolve) => {
      custSocket.on('message:read', (data) => resolve(data))
    })

    // Chef marks thread read
    chefSocket.emit('markMessagesRead', { threadId })

    const readData = await readReceiptPromise
    expect(readData.threadId).toBe(threadId)
    expect(readData.readBy).toBe(fixture.chef.userId)

    // Verify unread count is 0
    const unreadRes = await getUnreadCountHttp(fixture.chef.request, threadId)
    const unreadData = unreadRes.body.data ?? unreadRes.body
    expect(unreadData.unreadCount).toBe(0)

    custSocket.disconnect()
    chefSocket.disconnect()
  })

  // ── 9D: Typing Indicators ──────────────────────────────────────────────────

  test('9D-1: customer typing:start is forwarded to chef socket', async () => {
    const custSocket = await connectSocket('http://localhost:3000', fixture.customer.token)
    const chefSocket = await connectSocket('http://localhost:3000', fixture.chef.token)

    custSocket.emit('joinThread', { orderId: fixture.orderId })
    chefSocket.emit('joinThread', { orderId: fixture.orderId })
    await new Promise((r) => setTimeout(r, 300))

    const typingPromise = new Promise<any>((resolve) => {
      chefSocket.on('typing:start', (data) => resolve(data))
    })

    custSocket.emit('typing:start', { orderId: fixture.orderId })

    const typingData = await typingPromise
    expect(typingData.userId).toBe(fixture.customer.userId)
    expect(typingData.orderId).toBe(fixture.orderId)

    custSocket.disconnect()
    chefSocket.disconnect()
  })

  test('9D-2: customer typing:stop is forwarded to chef socket', async () => {
    const custSocket = await connectSocket('http://localhost:3000', fixture.customer.token)
    const chefSocket = await connectSocket('http://localhost:3000', fixture.chef.token)

    custSocket.emit('joinThread', { orderId: fixture.orderId })
    chefSocket.emit('joinThread', { orderId: fixture.orderId })
    await new Promise((r) => setTimeout(r, 300))

    const typingPromise = new Promise<any>((resolve) => {
      chefSocket.on('typing:stop', (data) => resolve(data))
    })

    custSocket.emit('typing:stop', { orderId: fixture.orderId })

    const typingData = await typingPromise
    expect(typingData.userId).toBe(fixture.customer.userId)

    custSocket.disconnect()
    chefSocket.disconnect()
  })

  // ── 9E: Offline Message Persistence & Retrieval ───────────────────────────

  test('9E-1: messages sent via socket are persisted and retrievable via HTTP listMessages API', async () => {
    const threadRes = await getThreadHttp(fixture.customer.request, fixture.orderId)
    const thread = threadRes.body.data ?? threadRes.body
    const threadId = thread._id

    const listRes = await listMessagesHttp(fixture.customer.request, threadId)
    expect(listRes.status).toBe(200)

    const listData = listRes.body.data ?? listRes.body
    expect(Array.isArray(listData.messages)).toBe(true)
    expect(listData.messages.length).toBeGreaterThan(0)
  })

  // ── 9F: Auth & Role Security Guards ────────────────────────────────────────

  test('9F-1: unauthenticated HTTP call returns 401 Unauthorized', async () => {
    const { request: pw } = await import('@playwright/test')
    const unauthReq = await pw.newContext({ baseURL: 'http://localhost:3000' })

    const res = await unauthReq.get('/api/v1/chat/threads')
    expect(res.status()).toBe(401)
  })
})
