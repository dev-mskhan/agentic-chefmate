export interface UnreadMessagePushData {
  messageId: string
  threadId: string
  senderId: string
}

export function unreadMessagePush(data: UnreadMessagePushData) {
  return {
    title: '💬 New message',
    body: 'You have an unread message',
    data: { threadId: data.threadId, messageId: data.messageId, screen: 'chat' },
  }
}
