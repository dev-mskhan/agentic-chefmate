import chatData from '../mock/fixtures/chat.json'

export interface ChatThreadItem {
  id: string
  orderId: string
  orderNumber: string
  orderStatus: string
  orderSummary: string
  customerId: string
  customerName: string
  customerAvatar: string
  chefId: string
  chefName: string
  chefAvatar: string
  kitchenName: string
  lastMessage: string
  lastMessageAt: string
  customerUnreadCount: number
  chefUnreadCount: number
  createdAt: string
  updatedAt: string
}

export interface ChatMessageItem {
  id: string
  threadId: string
  orderId: string
  senderId: string
  senderRole: 'USER' | 'CHEF'
  senderName: string
  content: string
  messageType: 'TEXT'
  readAt?: string
  clientMessageId?: string
  createdAt: string
}

// In-memory reactive state for mock mode
let localThreads: ChatThreadItem[] = [...(chatData.threads as ChatThreadItem[])]
let localMessages: Record<string, ChatMessageItem[]> = JSON.parse(JSON.stringify(chatData.messages))

export async function getMyThreads(role: 'USER' | 'CHEF' = 'USER', userId?: string): Promise<ChatThreadItem[]> {
  await new Promise((r) => setTimeout(r, 60))
  if (role === 'CHEF') {
    return localThreads.filter((t) => !userId || t.chefId === userId || t.chefId === 'chef-ayesha-khan')
  }
  return localThreads.filter((t) => !userId || t.customerId === userId || t.customerId === 'user-1')
}

export async function getThread(threadId: string): Promise<ChatThreadItem | null> {
  await new Promise((r) => setTimeout(r, 40))
  return localThreads.find((t) => t.id === threadId) ?? null
}

export async function getThreadByOrderId(orderId: string): Promise<ChatThreadItem | null> {
  await new Promise((r) => setTimeout(r, 40))
  let thread = localThreads.find((t) => t.orderId === orderId)
  if (!thread) {
    // Dynamically initialize a new thread if one doesn't exist yet for the order
    thread = {
      id: `thread-${Date.now()}`,
      orderId,
      orderNumber: orderId,
      orderStatus: 'CONFIRMED',
      orderSummary: 'Order Conversation',
      customerId: 'user-1',
      customerName: 'Zainab Ahmed',
      customerAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
      chefId: 'chef-ayesha-khan',
      chefName: 'Ayesha Khan',
      chefAvatar: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=300&q=80',
      kitchenName: "Ayesha's Dastarkhwan",
      lastMessage: 'Order confirmed. Chat started.',
      lastMessageAt: new Date().toISOString(),
      customerUnreadCount: 0,
      chefUnreadCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    localThreads = [thread, ...localThreads]
    localMessages[thread.id] = []
  }
  return thread
}

export async function listMessages(
  threadId: string,
  _limit = 50,
  _cursor?: string,
): Promise<{ items: ChatMessageItem[]; nextCursor?: string }> {
  await new Promise((r) => setTimeout(r, 50))
  const items = localMessages[threadId] || []
  return { items }
}

export async function sendMessage(
  threadId: string,
  content: string,
  senderRole: 'USER' | 'CHEF' = 'USER',
  senderId = 'user-1',
  senderName = 'Zainab Ahmed',
): Promise<ChatMessageItem> {
  await new Promise((r) => setTimeout(r, 60))
  const thread = localThreads.find((t) => t.id === threadId)
  const orderId = thread?.orderId ?? 'ORD-GENERIC'

  const newMessage: ChatMessageItem = {
    id: `msg-${Date.now()}`,
    threadId,
    orderId,
    senderId,
    senderRole,
    senderName,
    content,
    messageType: 'TEXT',
    createdAt: new Date().toISOString(),
  }

  if (!localMessages[threadId]) {
    localMessages[threadId] = []
  }
  localMessages[threadId] = [...localMessages[threadId], newMessage]

  if (thread) {
    thread.lastMessage = content
    thread.lastMessageAt = newMessage.createdAt
    if (senderRole === 'USER') {
      thread.chefUnreadCount += 1
    } else {
      thread.customerUnreadCount += 1
    }
  }

  return newMessage
}

export async function markMessagesRead(threadId: string, role: 'USER' | 'CHEF' = 'USER'): Promise<{ success: boolean }> {
  await new Promise((r) => setTimeout(r, 30))
  const thread = localThreads.find((t) => t.id === threadId)
  if (thread) {
    if (role === 'USER') {
      thread.customerUnreadCount = 0
    } else {
      thread.chefUnreadCount = 0
    }
  }
  const msgs = localMessages[threadId]
  if (msgs) {
    const now = new Date().toISOString()
    msgs.forEach((m) => {
      if (!m.readAt && m.senderRole !== role) {
        m.readAt = now
      }
    })
  }
  return { success: true }
}

export async function getUnreadCount(role: 'USER' | 'CHEF' = 'USER'): Promise<{ unreadCount: number }> {
  await new Promise((r) => setTimeout(r, 20))
  const count = localThreads.reduce((sum, t) => {
    return sum + (role === 'CHEF' ? t.chefUnreadCount : t.customerUnreadCount)
  }, 0)
  return { unreadCount: count }
}
