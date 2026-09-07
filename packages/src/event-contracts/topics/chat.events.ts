export const CHAT_EVENTS_TOPIC = 'chat.events'

export type ChatEvent =
  | {
      type: 'chat.message_sent'
      messageId: string
      threadId: string
      senderId: string
      recipientId: string
      content: string
      createdAt: string
      version: '1'
    }
  | {
      type: 'chat.message_unread'
      messageId: string
      threadId: string
      senderId: string
      recipientId: string
      createdAt: string
      version: '1'
    }
