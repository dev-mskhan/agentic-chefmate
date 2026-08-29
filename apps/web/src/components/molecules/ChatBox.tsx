import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Check, CheckCheck, Send, Utensils } from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  listMessages,
  sendMessage,
  markMessagesRead,
  type ChatMessageItem,
  type ChatThreadItem,
} from '../../services/api/chatService'

interface ChatBoxProps {
  thread: ChatThreadItem
  currentUserRole?: 'USER' | 'CHEF'
  currentUserId?: string
  currentUserName?: string
  className?: string
  showHeader?: boolean
  onClose?: () => void
}

export function ChatBox({
  thread,
  currentUserRole = 'USER',
  currentUserId = 'user-1',
  currentUserName = 'Zainab Ahmed',
  className = '',
  showHeader = true,
  onClose,
}: ChatBoxProps) {
  const [messages, setMessages] = useState<ChatMessageItem[]>([])
  const [inputText, setInputText] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const isInitialLoad = useRef(true)

  const partnerName = currentUserRole === 'USER' ? thread.chefName : thread.customerName
  const partnerAvatar = currentUserRole === 'USER' ? thread.chefAvatar : thread.customerAvatar
  const partnerSubtitle =
    currentUserRole === 'USER' ? thread.kitchenName : `Customer · Order #${thread.orderNumber}`

  const fetchThreadMessages = async () => {
    try {
      const res = await listMessages(thread.id)
      setMessages(res.items)
      await markMessagesRead(thread.id, currentUserRole)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    isInitialLoad.current = true
    fetchThreadMessages()
    // Poll for new messages every 3.5 seconds
    const interval = window.setInterval(fetchThreadMessages, 3500)
    return () => window.clearInterval(interval)
  }, [thread.id, currentUserRole])

  // Scroll ONLY the inner message container to bottom, never touching window.scrollY
  useEffect(() => {
    if (scrollContainerRef.current) {
      if (isInitialLoad.current) {
        scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight
        isInitialLoad.current = false
      } else {
        scrollContainerRef.current.scrollTo({
          top: scrollContainerRef.current.scrollHeight,
          behavior: 'smooth',
        })
      }
    }
  }, [messages.length])

  const handleSend = async (e: FormEvent) => {
    e.preventDefault()
    const trimmed = inputText.trim()
    if (!trimmed || sending) return

    setSending(true)
    try {
      const newMsg = await sendMessage(
        thread.id,
        trimmed,
        currentUserRole,
        currentUserId,
        currentUserName,
      )
      setMessages((prev) => [...prev, newMsg])
      setInputText('')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className={`flex flex-col h-full bg-cream rounded-2xl border border-charcoal/10 shadow-sm overflow-hidden ${className}`}>
      {/* Header */}
      {showHeader && (
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-charcoal/10 bg-cream-dim/60 shrink-0">
          <div className="flex items-center gap-3">
            <img
              src={partnerAvatar}
              alt={partnerName}
              className="w-10 h-10 rounded-full object-cover border border-charcoal/10"
            />
            <div>
              <h3 className="text-xs font-bold text-charcoal">{partnerName}</h3>
              <p className="text-[11px] text-charcoal-70">{partnerSubtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to={currentUserRole === 'CHEF' ? `/chef/orders/${thread.orderId}` : `/orders/${thread.orderId}`}
              className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-pill bg-cream border border-charcoal/10 text-charcoal-70 hover:text-terracotta hover:border-terracotta/30 transition-colors"
            >
              <Utensils size={12} />
              <span>Order #{thread.orderNumber}</span>
            </Link>

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded-full text-charcoal-70 hover:bg-cream-dim transition-colors"
                aria-label="Close chat"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      )}

      {/* Order Context Strip */}
      <div className="bg-terracotta-10/70 px-4 py-2 border-b border-terracotta/10 flex items-center justify-between text-xs shrink-0">
        <div className="flex items-center gap-1.5 text-terracotta-dark font-medium truncate">
          <Utensils size={13} className="shrink-0" />
          <span className="truncate">{thread.orderSummary}</span>
        </div>
        <span className="px-2 py-0.5 rounded-pill bg-terracotta text-cream text-[10px] font-bold tracking-wider uppercase shrink-0 ml-2">
          {thread.orderStatus}
        </span>
      </div>

      {/* Messages Scroll Area - strictly isolated container scrolling */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[260px] max-h-[500px]"
      >
        {loading && messages.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-xs text-charcoal-70">
            Loading messages...
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center p-4">
            <div className="w-10 h-10 rounded-full bg-cream-dim flex items-center justify-center text-terracotta mb-2">
              <Send size={16} />
            </div>
            <p className="text-xs font-bold text-charcoal">No messages yet</p>
            <p className="text-[11px] text-charcoal-70 mt-1 max-w-xs">
              Coordinate kitchen prep details, spice preference, or delivery timing directly.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMine = msg.senderRole === currentUserRole
            const timeStr = new Intl.DateTimeFormat('en-PK', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true,
            }).format(new Date(msg.createdAt))

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[82%] sm:max-w-[70%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed shadow-sm ${
                    isMine
                      ? 'bg-terracotta text-cream rounded-br-none'
                      : 'bg-cream-dim text-charcoal rounded-bl-none border border-charcoal/8'
                  }`}
                >
                  <p>{msg.content}</p>
                </div>

                <div className="flex items-center gap-1 mt-1 px-1 text-[10px] text-charcoal-70/70">
                  <span>{timeStr}</span>
                  {isMine && (
                    <span title={msg.readAt ? 'Read' : 'Delivered'}>
                      {msg.readAt ? (
                        <CheckCheck size={12} className="text-terracotta" />
                      ) : (
                        <Check size={12} className="text-charcoal-70/50" />
                      )}
                    </span>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Input Bar */}
      <form onSubmit={handleSend} className="p-3 bg-cream border-t border-charcoal/10 shrink-0">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              currentUserRole === 'CHEF'
                ? 'Reply with prep updates, spice levels...'
                : 'Ask chef about dietary needs, delivery notes...'
            }
            className="flex-1 rounded-pill bg-cream-dim px-4 py-2.5 text-xs text-charcoal border border-charcoal/10 outline-none focus:ring-2 focus:ring-terracotta/20 focus:border-terracotta"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || sending}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-terracotta text-cream disabled:opacity-40 hover:bg-terracotta-dark transition-colors shrink-0 shadow-xs"
          >
            <Send size={15} />
          </button>
        </div>
      </form>
    </div>
  )
}
