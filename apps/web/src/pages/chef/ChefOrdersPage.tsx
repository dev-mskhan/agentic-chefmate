import { useEffect, useState } from 'react'
import {
  Calendar,
  MessageSquare,
  Phone,
} from 'lucide-react'
import { ChefShell } from '../../components/templates/ChefShell'
import { Badge } from '../../components/atoms/Badge'
import { Button } from '../../components/atoms/Button'
import { EmptyState } from '../../components/atoms/EmptyState'
import { Skeleton } from '../../components/atoms/Skeleton'
import { ChatDrawer } from '../../components/molecules/ChatDrawer'
import {
  getChefOrders,
  updateChefOrderStatus,
  type ChefIncomingOrder,
} from '../../services/api/chefService'
import type { OrderStatus } from '../../types/domain'

export function ChefOrdersPage() {
  const [orders, setOrders] = useState<ChefIncomingOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'PREPARING' | 'READY' | 'DELIVERED'>('ALL')
  const [activeChatOrderId, setActiveChatOrderId] = useState<string | null>(null)

  useEffect(() => {
    getChefOrders()
      .then((data) => setOrders(data))
      .finally(() => setLoading(false))
  }, [])

  const handleUpdateStatus = async (orderId: string, nextStatus: OrderStatus) => {
    await updateChefOrderStatus(orderId, nextStatus)
    const refreshed = await getChefOrders()
    setOrders(refreshed)
  }

  const filtered = orders.filter((o) => {
    if (filter === 'PENDING') return o.status === 'PENDING' || o.status === 'CONFIRMED'
    if (filter === 'PREPARING') return o.status === 'PREPARING'
    if (filter === 'READY') return o.status === 'READY' || o.status === 'OUT_FOR_DELIVERY'
    if (filter === 'DELIVERED') return o.status === 'DELIVERED'
    return true
  })

  return (
    <ChefShell
      title="Order Management Queue"
      subtitle="Track customer orders, prepare small-batch batches, and manage delivery status."
    >
      <div className="space-y-6">
        {/* Filter Pills */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-charcoal/10 pb-4">
          <div className="flex items-center gap-1.5 rounded-pill bg-cream p-1 text-xs font-semibold border border-charcoal/10">
            {(['ALL', 'PENDING', 'PREPARING', 'READY', 'DELIVERED'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setFilter(tab)}
                className={`rounded-pill px-3.5 py-1.5 transition-all ${
                  filter === tab
                    ? 'bg-terracotta text-cream shadow-sm'
                    : 'text-charcoal-70 hover:text-charcoal'
                }`}
              >
                {tab === 'ALL'
                  ? `All (${orders.length})`
                  : tab === 'PENDING'
                    ? 'Received'
                    : tab === 'PREPARING'
                      ? 'Cooking'
                      : tab === 'READY'
                        ? 'Ready / In Transit'
                        : 'Delivered'}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-44 w-full rounded-3xl" />
            <Skeleton className="h-44 w-full rounded-3xl" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No orders found"
            description="There are currently no orders in this queue state."
          />
        ) : (
          <div className="space-y-4">
            {filtered.map((order) => {
              return (
                <div
                  key={order.id}
                  className="rounded-3xl bg-cream p-6 border border-charcoal/10 shadow-sm space-y-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-charcoal/10 pb-4">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs font-bold text-charcoal bg-cream-dim px-3 py-1 rounded-lg border border-charcoal/10">
                        #{order.id}
                      </span>
                      <span className="text-xs text-charcoal-70 flex items-center gap-1">
                        <Calendar size={13} className="text-terracotta" />
                        Delivery:{' '}
                        <strong className="text-charcoal">{order.deliveryDate}</strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge
                        tone={
                          order.status === 'DELIVERED'
                            ? 'success'
                            : order.status === 'PREPARING'
                              ? 'warning'
                              : 'accent'
                        }
                      >
                        {order.status}
                      </Badge>
                      <span className="text-xs font-bold text-charcoal tabular-nums">
                        {order.currency} {order.total.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="grid gap-6 md:grid-cols-[1.2fr_0.8fr] items-start">
                    <div className="space-y-3">
                      <div>
                        <strong className="text-sm font-bold text-charcoal block">
                          {order.customerName}
                        </strong>
                        <p className="text-xs text-charcoal-70 flex items-center gap-1 mt-0.5">
                          <Phone size={12} className="text-terracotta" />
                          {order.customerPhone} · {order.deliveryAddress}
                        </p>
                      </div>

                      <div className="space-y-1 bg-cream-dim p-3 rounded-2xl border border-charcoal/10">
                        <span className="text-[10px] uppercase font-bold text-terracotta block">
                          Dishes to prepare:
                        </span>
                        {order.items.map((item) => (
                          <div
                            key={item.dishId}
                            className="flex justify-between text-xs text-charcoal"
                          >
                            <span className="font-medium">
                              <strong>{item.quantity}x</strong> {item.name}
                            </span>
                            <span className="tabular-nums font-semibold">
                              {order.currency} {(item.price * item.quantity).toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>

                      {order.customerNote && (
                        <p className="text-xs text-charcoal italic bg-terracotta-10 p-2.5 rounded-xl border border-terracotta/20">
                          Special preference: "{order.customerNote}"
                        </p>
                      )}
                    </div>

                    {/* Status Advance Controls */}
                    <div className="flex flex-col items-end gap-2 pt-2 md:pt-0">
                      <span className="text-[10px] uppercase font-bold text-charcoal-70">
                        Update Order Status
                      </span>

                      <div className="flex flex-wrap gap-2 justify-end">
                        {order.status === 'PENDING' && (
                          <Button
                            onClick={() => handleUpdateStatus(order.id, 'CONFIRMED')}
                            className="text-xs py-2 px-3"
                          >
                            Confirm Order
                          </Button>
                        )}
                        {order.status === 'CONFIRMED' && (
                          <Button
                            onClick={() => handleUpdateStatus(order.id, 'PREPARING')}
                            className="text-xs py-2 px-3 bg-terracotta"
                          >
                            Start Cooking
                          </Button>
                        )}
                        {order.status === 'PREPARING' && (
                          <Button
                            onClick={() => handleUpdateStatus(order.id, 'READY')}
                            className="text-xs py-2 px-3 bg-sage"
                          >
                            Mark Ready
                          </Button>
                        )}
                        {order.status === 'READY' && (
                          <Button
                            onClick={() => handleUpdateStatus(order.id, 'OUT_FOR_DELIVERY')}
                            className="text-xs py-2 px-3"
                          >
                            Dispatch with Courier
                          </Button>
                        )}
                        {order.status === 'OUT_FOR_DELIVERY' && (
                          <Button
                            onClick={() => handleUpdateStatus(order.id, 'DELIVERED')}
                            className="text-xs py-2 px-3 bg-sage"
                          >
                            Mark Delivered
                          </Button>
                        )}
                        <button
                          type="button"
                          onClick={() => setActiveChatOrderId(order.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-pill bg-cream text-charcoal border border-charcoal/15 text-xs font-semibold hover:border-terracotta hover:text-terracotta transition-colors shadow-xs"
                        >
                          <MessageSquare size={13} /> Chat with Customer
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Direct Chef-Customer Chat Drawer */}
        {activeChatOrderId && (
          <ChatDrawer
            orderId={activeChatOrderId}
            currentUserRole="CHEF"
            isOpen={!!activeChatOrderId}
            onClose={() => setActiveChatOrderId(null)}
          />
        )}
      </div>
    </ChefShell>
  )
}
