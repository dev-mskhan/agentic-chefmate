import { useEffect, useState } from 'react'
import {
  Bell,
  CheckCheck,
  Clock3,
  Package,
  Tag,
} from 'lucide-react'
import { PublicShell } from '../../components/templates/PublicShell'
import { PageContainer } from '../../components/templates/PageContainer'
import { Button } from '../../components/atoms/Button'
import { EmptyState } from '../../components/atoms/EmptyState'
import { Skeleton } from '../../components/atoms/Skeleton'
import {
  getUserNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationRecord,
} from '../../services/api/userService'

export function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'ALL' | 'UNREAD' | 'ORDERS' | 'PROMOS'>('ALL')

  useEffect(() => {
    getUserNotifications()
      .then((data) => setNotifications(data))
      .finally(() => setLoading(false))
  }, [])

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead()
    const refreshed = await getUserNotifications()
    setNotifications(refreshed)
  }

  const handleMarkSingleRead = async (id: string) => {
    await markNotificationRead(id)
    const refreshed = await getUserNotifications()
    setNotifications(refreshed)
  }

  const filtered = notifications.filter((notif) => {
    if (filter === 'UNREAD') return !notif.readAt
    if (filter === 'ORDERS') return notif.category === 'orderUpdates'
    if (filter === 'PROMOS') return notif.category === 'promotions'
    return true
  })

  const unreadCount = notifications.filter((n) => !n.readAt).length

  return (
    <PublicShell>
      <PageContainer className="pb-24 pt-8 sm:pt-12 space-y-8">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-charcoal/10 pb-6">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-terracotta flex items-center gap-1.5">
              <Bell size={14} /> Customer Dashboard
            </span>
            <h1 className="font-display text-3xl sm:text-4xl text-charcoal tracking-tight mt-1">
              Notifications
            </h1>
            <p className="text-xs text-charcoal-70 mt-1">
              Order progress milestones, subscription renewals, and kitchen offers.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {unreadCount > 0 && (
              <Button
                variant="secondary"
                onClick={handleMarkAllRead}
                className="text-xs py-2 px-3.5 gap-1.5"
              >
                <CheckCheck size={14} /> Mark all as read
              </Button>
            )}

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 rounded-pill bg-cream-dim p-1 text-xs font-semibold">
              {(['ALL', 'UNREAD', 'ORDERS', 'PROMOS'] as const).map((tab) => {
                const label =
                  tab === 'ALL'
                    ? `All (${notifications.length})`
                    : tab === 'UNREAD'
                      ? `Unread (${unreadCount})`
                      : tab === 'ORDERS'
                        ? 'Orders'
                        : 'Promos'
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setFilter(tab)}
                    className={`rounded-pill px-3 py-1.5 transition-all ${
                      filter === tab
                        ? 'bg-terracotta text-cream shadow-sm'
                        : 'text-charcoal-70 hover:text-charcoal'
                    }`}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full rounded-2xl" />
            <Skeleton className="h-24 w-full rounded-2xl" />
            <Skeleton className="h-24 w-full rounded-2xl" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No notifications"
            description="You don't have any notifications under this filter."
          />
        ) : (
          <div className="space-y-3">
            {filtered.map((notif) => {
              const isUnread = !notif.readAt
              const isPromo = notif.category === 'promotions'

              return (
                <div
                  key={notif.id}
                  onClick={() => isUnread && handleMarkSingleRead(notif.id)}
                  className={`rounded-2xl p-5 border transition-all cursor-pointer flex items-start justify-between gap-4 ${
                    isUnread
                      ? 'bg-cream-dim/90 border-terracotta/40 shadow-sm'
                      : 'bg-cream border-charcoal/10 opacity-80 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    <div
                      className={`p-2.5 rounded-2xl shrink-0 ${
                        isPromo ? 'bg-saffron/15 text-saffron-dark' : 'bg-terracotta-10 text-terracotta'
                      }`}
                    >
                      {isPromo ? <Tag size={18} /> : <Package size={18} />}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-display text-base font-bold text-charcoal">
                          {notif.title}
                        </h3>
                        {isUnread && (
                          <span className="h-2 w-2 rounded-full bg-terracotta shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-charcoal-70 leading-relaxed max-w-xl">
                        {notif.message}
                      </p>
                      <span className="text-[10px] text-charcoal-70 flex items-center gap-1 pt-1">
                        <Clock3 size={11} /> {new Date(notif.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {isUnread && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleMarkSingleRead(notif.id)
                      }}
                      className="text-[11px] font-semibold text-terracotta hover:underline shrink-0"
                    >
                      Mark read
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </PageContainer>
    </PublicShell>
  )
}
