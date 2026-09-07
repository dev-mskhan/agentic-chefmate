import { useEffect, useRef, useState, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { getCurrentUser } from '../lib/auth'

export interface ChatMessage {
  id: string
  threadId: string
  senderId: string
  senderRole: 'USER' | 'CHEF'
  content: string
  clientMessageId?: string
  readAt?: string | null
  createdAt: string
}

export function useChatSocket(threadId: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const socketRef = useRef<Socket | null>(null)
  const user = getCurrentUser()
  const isMock = import.meta.env.VITE_USE_MOCK === 'true'

  // Load existing messages from localStorage / API
  useEffect(() => {
    if (!threadId) return

    const storageKey = `chefmate_chat_thread_${threadId}`
    const raw = localStorage.getItem(storageKey)
    if (raw) {
      try {
        setMessages(JSON.parse(raw))
      } catch {
        setMessages([])
      }
    } else {
      // Default welcome initial message from kitchen
      const initial: ChatMessage[] = [
        {
          id: `msg-${Date.now()}-init`,
          threadId,
          senderId: 'chef-kitchen',
          senderRole: 'CHEF',
          content: 'Hello! Thank you for ordering with us. Feel free to ask any questions about spices, preparation, or delivery timing.',
          createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
        },
      ]
      setMessages(initial)
      localStorage.setItem(storageKey, JSON.stringify(initial))
    }
  }, [threadId])

  // Establish live socket connection if not mock
  useEffect(() => {
    if (!threadId || isMock) return

    const socket = io('/api/v1/chat/socket', {
      withCredentials: true,
      path: '/socket.io',
      transports: ['websocket', 'polling'],
    })
    socketRef.current = socket

    socket.on('connect', () => {
      setIsConnected(true)
      socket.emit('join-thread', { threadId })
    })

    socket.on('disconnect', () => {
      setIsConnected(false)
    })

    socket.on('new-message', (msg: ChatMessage) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id || (msg.clientMessageId && m.clientMessageId === msg.clientMessageId))) {
          return prev
        }
        const updated = [...prev, msg]
        localStorage.setItem(`chefmate_chat_thread_${threadId}`, JSON.stringify(updated))
        return updated
      })
    })

    socket.on('user-typing', (data: { threadId: string; isTyping: boolean }) => {
      if (data.threadId === threadId) {
        setIsTyping(data.isTyping)
      }
    })

    return () => {
      socket.emit('leave-thread', { threadId })
      socket.disconnect()
      socketRef.current = null
    }
  }, [threadId, isMock])

  const sendMessage = useCallback(
    (content: string, senderRole: 'USER' | 'CHEF' = 'USER') => {
      if (!threadId || !content.trim()) return

      const clientMessageId = `cm-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
      const newMsg: ChatMessage = {
        id: `msg-${Date.now()}`,
        threadId,
        senderId: user?.id || (senderRole === 'CHEF' ? 'chef-ayesha' : 'user-tariq'),
        senderRole,
        content: content.trim(),
        clientMessageId,
        createdAt: new Date().toISOString(),
      }

      // Optimistic state update
      setMessages((prev) => {
        const updated = [...prev, newMsg]
        localStorage.setItem(`chefmate_chat_thread_${threadId}`, JSON.stringify(updated))
        return updated
      })

      if (!isMock && socketRef.current?.connected) {
        socketRef.current.emit('send-message', {
          threadId,
          content: newMsg.content,
          clientMessageId,
        })
      } else {
        // Auto-reply mock response if in mock mode and user sent message
        if (senderRole === 'USER') {
          setTimeout(() => {
            const chefReply: ChatMessage = {
              id: `msg-${Date.now()}-reply`,
              threadId,
              senderId: 'chef-kitchen',
              senderRole: 'CHEF',
              content: 'Got it! Your meal will be cooked with fresh, small-batch ingredients as requested. Let us know if you need anything else.',
              createdAt: new Date().toISOString(),
            }
            setMessages((prev) => {
              const updated = [...prev, chefReply]
              localStorage.setItem(`chefmate_chat_thread_${threadId}`, JSON.stringify(updated))
              return updated
            })
          }, 1200)
        }
      }
    },
    [threadId, isMock, user?.id],
  )

  const sendTyping = useCallback(
    (typing: boolean) => {
      if (!threadId || isMock || !socketRef.current?.connected) return
      socketRef.current.emit('typing', { threadId, isTyping: typing })
    },
    [threadId, isMock],
  )

  return {
    messages,
    isTyping,
    isConnected,
    sendMessage,
    sendTyping,
  }
}
