import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { MessageSquare, Search, Utensils, ChevronLeft } from 'lucide-react'
import { PublicShell } from '../../components/templates/PublicShell'
import { ChatBox } from '../../components/molecules/ChatBox'
import { useAuth } from '../../hooks/useAuth'
import {
  getMyThreads,
  type ChatThreadItem,
} from '../../services/api/chatService'

export function MessagesPage() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [threads, setThreads] = useState<ChatThreadItem[]>([])
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(
    searchParams.get('threadId') || null,
  )
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getMyThreads('USER', user?.id)
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
      t.chefName.toLowerCase().includes(q) ||
      t.kitchenName.toLowerCase().includes(q) ||
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
    <PublicShell>
      <div className="mx-auto max-w-[1500px] px-4 py-8 sm:px-8 lg:px-12 2xl:px-16">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-widest text-terracotta">
                Direct Communication
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-pill bg-sage/15 text-sage text-[11px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-sage animate-pulse" /> Live Kitchen Channel
              </span>
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-charcoal mt-1">
              Order Messages
            </h1>
            <p className="text-sm text-charcoal-70 mt-1">
              Coordinate preparation preferences and delivery timing with your chefs.
            </p>
          </div>

          <Link
            to="/orders"
            className="inline-flex items-center gap-2 text-xs font-bold text-charcoal-70 hover:text-terracotta rounded-pill bg-cream px-4 py-2 border border-charcoal/10 transition-colors"
          >
            <Utensils size={14} /> View All Orders
          </Link>
        </div>

        {/* Chat Hub Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] rounded-3xl bg-cream border border-charcoal/10 shadow-lg overflow-hidden min-h-[620px]">
          {/* Thread List Sidebar */}
          <div
            className={`border-r border-charcoal/10 flex flex-col bg-cream-dim/30 ${
              selectedThreadId ? 'hidden lg:flex' : 'flex'
            }`}
          >
            {/* Search filter */}
            <div className="p-4 border-b border-charcoal/10">
              <div className="flex items-center gap-2.5 rounded-2xl bg-cream px-3.5 py-2 border border-charcoal/10 text-xs">
                <Search size={15} className="text-charcoal-70" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search chef, kitchen, or order #..."
                  className="w-full bg-transparent text-charcoal outline-none placeholder:text-charcoal-70/60"
                />
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto divide-y divide-charcoal/8">
              {loading ? (
                <div className="p-8 text-center text-xs text-charcoal-70">
                  Loading conversations...
                </div>
              ) : filteredThreads.length === 0 ? (
                <div className="p-8 text-center space-y-2">
                  <MessageSquare size={24} className="mx-auto text-charcoal-70/50" />
                  <p className="text-xs font-bold text-charcoal">No conversations found</p>
                  <p className="text-[11px] text-charcoal-70">
                    When you place an order, you can message the chef directly from your order page.
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
                      className={`w-full text-left p-4 flex items-start gap-3.5 transition-all ${
                        isSelected
                          ? 'bg-cream border-l-4 border-l-terracotta shadow-xs'
                          : 'hover:bg-cream-dim/60'
                      }`}
                    >
                      <div className="relative shrink-0">
                        <img
                          src={t.chefAvatar}
                          alt={t.chefName}
                          className="w-12 h-12 rounded-full object-cover border border-charcoal/10 shadow-xs"
                        />
                        {t.customerUnreadCount > 0 && (
                          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-terracotta text-[10px] font-bold text-cream">
                            {t.customerUnreadCount}
                          </span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className="text-xs font-bold text-charcoal truncate">{t.chefName}</h4>
                          <span className="text-[10px] text-charcoal-70 shrink-0 font-medium">
                            {timeFormatted}
                          </span>
                        </div>

                        <p className="text-[11px] font-semibold text-terracotta-dark truncate mt-0.5">
                          {t.kitchenName} · Order #{t.orderNumber}
                        </p>

                        <p className="text-xs text-charcoal-70 truncate mt-1">
                          {t.lastMessage}
                        </p>

                        <div className="mt-2 flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-pill bg-cream text-[10px] font-bold text-charcoal-70 border border-charcoal/10 uppercase tracking-wider">
                            {t.orderStatus}
                          </span>
                          <span className="text-[10px] text-charcoal-70 truncate max-w-[180px]">
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

          {/* Active Conversation Pane */}
          <div className={`flex flex-col flex-1 ${!selectedThreadId ? 'hidden lg:flex' : 'flex'}`}>
            {selectedThread ? (
              <div className="flex flex-col h-full">
                {/* Mobile Back Button */}
                <div className="p-3 bg-cream border-b border-charcoal/10 flex items-center gap-2 lg:hidden">
                  <button
                    type="button"
                    onClick={() => setSelectedThreadId(null)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-terracotta px-3 py-1.5 rounded-pill bg-terracotta-10"
                  >
                    <ChevronLeft size={16} /> All Messages
                  </button>
                  <span className="text-xs font-bold text-charcoal truncate">
                    {selectedThread.chefName}
                  </span>
                </div>

                <ChatBox
                  thread={selectedThread}
                  currentUserRole="USER"
                  currentUserId={user?.id || 'user-1'}
                  currentUserName={user?.displayName || 'Zainab Ahmed'}
                  className="rounded-none border-none shadow-none flex-1"
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center flex-1 p-8 text-center space-y-3">
                <div className="w-16 h-16 rounded-full bg-cream-dim flex items-center justify-center text-terracotta">
                  <MessageSquare size={28} />
                </div>
                <h3 className="font-display text-xl font-bold text-charcoal">
                  Select a kitchen conversation
                </h3>
                <p className="text-xs text-charcoal-70 max-w-sm">
                  Choose a thread from the list on the left to review order instructions and message the chef.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </PublicShell>
  )
}
