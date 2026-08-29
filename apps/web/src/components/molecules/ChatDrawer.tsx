import { useEffect, useState } from 'react'
import { MessageSquare } from 'lucide-react'
import { ChatBox } from './ChatBox'
import {
  getThreadByOrderId,
  type ChatThreadItem,
} from '../../services/api/chatService'

interface ChatDrawerProps {
  orderId: string
  currentUserRole?: 'USER' | 'CHEF'
  currentUserId?: string
  currentUserName?: string
  isOpen: boolean
  onClose: () => void
}

export function ChatDrawer({
  orderId,
  currentUserRole = 'USER',
  currentUserId,
  currentUserName,
  isOpen,
  onClose,
}: ChatDrawerProps) {
  const [thread, setThread] = useState<ChatThreadItem | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen && orderId) {
      setLoading(true)
      getThreadByOrderId(orderId)
        .then((data) => setThread(data))
        .finally(() => setLoading(false))
    }
  }, [isOpen, orderId])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-end sm:justify-end p-0 sm:p-6 bg-charcoal/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full sm:max-w-md h-[90vh] sm:h-[620px] bg-cream rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-charcoal/15 animate-in slide-in-from-bottom-6 sm:slide-in-from-right duration-250"
        role="dialog"
        aria-modal="true"
        aria-label="Direct Kitchen Chat"
      >
        {loading || !thread ? (
          <div className="flex flex-col items-center justify-center flex-1 p-6 space-y-3">
            <div className="w-12 h-12 rounded-full bg-cream-dim flex items-center justify-center text-terracotta animate-pulse">
              <MessageSquare size={22} />
            </div>
            <p className="text-sm font-semibold text-charcoal">Connecting to kitchen channel...</p>
          </div>
        ) : (
          <ChatBox
            thread={thread}
            currentUserRole={currentUserRole}
            currentUserId={currentUserId}
            currentUserName={currentUserName}
            onClose={onClose}
            className="border-none shadow-none rounded-none h-full"
          />
        )}
      </div>
    </div>
  )
}
