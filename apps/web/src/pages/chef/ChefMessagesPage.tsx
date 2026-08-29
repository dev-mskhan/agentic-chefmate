import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { MessageSquare, Search, Utensils, ChevronLeft } from 'lucide-react'
import { ChefShell } from '../../components/templates/ChefShell'
import { ChatBox } from '../../components/molecules/ChatBox'
import { useAuth } from '../../hooks/useAuth'
import {
  getMyThreads,
  type ChatThreadItem,
} from '../../services/api/chatService'

export function ChefMessagesPage() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [threads, setThreads] = useState<ChatThreadItem[]>([])
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(
    searchParams.get('threadId') || null,
  )
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getMyThreads('CHEF', user?.id)
      .then((data) => {
        setThreads(data)
        if (!selectedThreadId && data.length > 0) {
          const initial = searchParams.get('threadId') || data[0].id
          setSelectedThreadId(initial)
        }
      })
      .finally(() => setLoading(false))
  }, [user?.id])

  const filteredThreads = threads.filter((t) => {
    const q = searchQuery.toLowerCase()
    return (
      t.customerName.toLowerCase().includes(q) ||
      t.orderNumber.toLowerCase().includes(q) ||
      t.orderSummary.toLowerCase().includes(q)
    )
  })

  const selectedThread = threads.find((t) => t.id === selectedThreadId)

  const handleSelectThread = (threadId: string) => {
    setSelectedThreadId(threadId)
    setSearchParams({ threadId })
  }

  return (
    <ChefShell
      title="Kitchen Customer Messaging"
      subtitle="Direct customer order coordination, dietary queries, and delivery status updates."
      actions={
        <Link
          to="/chef/orders"
          className="inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-1.5 rounded-pill bg-cream text-charcoal border border-charcoal/10 hover:border-terracotta transition-colors"
        >
          <Utensils size={13} /> Active Orders
        </Link>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] rounded-3xl bg-cream border border-charcoal/10 shadow-sm overflow-hidden min-h-[600px]">
        {/* Left Thread List */}
        <div
          className={`border-r border-charcoal/10 flex flex-col bg-cream-dim/20 ${
            selectedThreadId ? 'hidden lg:flex' : 'flex'
          }`}
        >
          <div className="p-4 border-b border-charcoal/10">
            <div className="flex items-center gap-2 rounded-2xl bg-cream px-3.5 py-2 border border-charcoal/10 text-xs">
              <Search size={14} className="text-charcoal-70" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search customer or order #..."
                className="w-full bg-transparent text-charcoal outline-none placeholder:text-charcoal-70/60 text-xs"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-charcoal/8">
            {loading ? (
              <div className="p-6 text-center text-xs text-charcoal-70">
                Loading customer inquiries...
              </div>
            ) : filteredThreads.length === 0 ? (
              <div className="p-6 text-center space-y-2">
                <MessageSquare size={22} className="mx-auto text-charcoal-70/40" />
                <p className="text-xs font-bold text-charcoal">No customer threads</p>
                <p className="text-[11px] text-charcoal-70">
                  Customer messages for incoming orders will appear here.
                </p>
              </div>
            ) : (
              filteredThreads.map((t) => {
                const isSelected = t.id === selectedThreadId
                const timeFormatted = new Intl.DateTimeFormat('en-PK', {
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true,
                }).format(new Date(t.lastMessageAt))

                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleSelectThread(t.id)}
                    className={`w-full text-left p-4 flex items-start gap-3 transition-all ${
                      isSelected
                        ? 'bg-cream border-l-4 border-l-terracotta shadow-xs'
                        : 'hover:bg-cream-dim/50'
                    }`}
                  >
                    <div className="relative shrink-0">
                      <img
                        src={t.customerAvatar}
                        alt={t.customerName}
                        className="w-11 h-11 rounded-full object-cover border border-charcoal/10 shadow-xs"
                      />
                      {t.chefUnreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-terracotta text-[9px] font-bold text-cream">
                          {t.chefUnreadCount}
                        </span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className="text-xs font-bold text-charcoal truncate">{t.customerName}</h4>
                        <span className="text-[10px] text-charcoal-70 font-medium">
                          {timeFormatted}
                        </span>
                      </div>

                      <p className="text-[11px] font-semibold text-terracotta-dark truncate mt-0.5">
                        Order #{t.orderNumber}
                      </p>

                      <p className="text-xs text-charcoal-70 truncate mt-1">
                        {t.lastMessage}
                      </p>

                      <div className="mt-2 flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-pill bg-cream text-[9px] font-bold text-charcoal-70 border border-charcoal/10 uppercase">
                          {t.orderStatus}
                        </span>
                        <span className="text-[10px] text-charcoal-70 truncate max-w-[170px]">
                          {t.orderSummary}
                        </span>
                      </div>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* Right Active Conversation */}
        <div className={`flex flex-col flex-1 ${!selectedThreadId ? 'hidden lg:flex' : 'flex'}`}>
          {selectedThread ? (
            <div className="flex flex-col h-full">
              <div className="p-3 bg-cream border-b border-charcoal/10 flex items-center gap-2 lg:hidden">
                <button
                  type="button"
                  onClick={() => setSelectedThreadId(null)}
                  className="inline-flex items-center gap-1 text-xs font-bold text-terracotta px-3 py-1.5 rounded-pill bg-terracotta-10"
                >
                  <ChevronLeft size={15} /> Back
                </button>
                <span className="text-xs font-bold text-charcoal truncate">
                  {selectedThread.customerName}
                </span>
              </div>

              <ChatBox
                thread={selectedThread}
                currentUserRole="CHEF"
                currentUserId={user?.id || 'chef-ayesha-khan'}
                currentUserName={user?.displayName || 'Chef Ayesha Khan'}
                className="rounded-none border-none shadow-none flex-1"
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center flex-1 p-8 text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-cream-dim flex items-center justify-center text-terracotta">
                <MessageSquare size={24} />
              </div>
              <h3 className="font-display text-lg font-bold text-charcoal">
                Select a customer message
              </h3>
              <p className="text-xs text-charcoal-70 max-w-sm">
                Pick a conversation on the left to coordinate order instructions and delivery with the customer.
              </p>
            </div>
          )}
        </div>
      </div>
    </ChefShell>
  )
}
