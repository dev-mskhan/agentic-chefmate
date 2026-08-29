import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  ClipboardList,
  Clock3,
  Package,
  Plus,
  Star,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import { ChefShell } from '../../components/templates/ChefShell'
import { Badge } from '../../components/atoms/Badge'
import { Button } from '../../components/atoms/Button'
import { Skeleton } from '../../components/atoms/Skeleton'
import {
  getChefOverview,
  updateChefOrderStatus,
  type ChefIncomingOrder,
  type ChefOverviewMetrics,
} from '../../services/api/chefService'
import type { OrderStatus } from '../../types/domain'

export function ChefOverviewPage() {
  const [metrics, setMetrics] = useState<ChefOverviewMetrics | null>(null)
  const [orders, setOrders] = useState<ChefIncomingOrder[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getChefOverview().then((res) => {
      setMetrics(res.metrics)
      setOrders(res.recentOrders)
      setLoading(false)
    })
  }, [])

  const handleAdvanceStatus = async (orderId: string, current: OrderStatus) => {
    let next: OrderStatus = 'CONFIRMED'
    if (current === 'PENDING') next = 'CONFIRMED'
    else if (current === 'CONFIRMED') next = 'PREPARING'
    else if (current === 'PREPARING') next = 'READY'
    else if (current === 'READY') next = 'OUT_FOR_DELIVERY'
    else if (current === 'OUT_FOR_DELIVERY') next = 'DELIVERED'

    await updateChefOrderStatus(orderId, next)
    const refreshed = await getChefOverview()
    setOrders(refreshed.recentOrders)
  }

  if (loading || !metrics) {
    return (
      <ChefShell title="Kitchen Overview" subtitle="Live small-batch production and queue">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-32 rounded-3xl" />
          <Skeleton className="h-32 rounded-3xl" />
          <Skeleton className="h-32 rounded-3xl" />
          <Skeleton className="h-32 rounded-3xl" />
        </div>
      </ChefShell>
    )
  }

  return (
    <ChefShell
      title="Kitchen Overview"
      subtitle="Calm live dashboard for today's orders, prep capacity, and earnings."
      actions={
        <Link
          to="/chef/dishes"
          className="inline-flex items-center gap-1.5 rounded-pill bg-terracotta px-4 py-2 text-xs font-semibold text-cream hover:bg-terracotta-dark transition-colors shadow-sm"
        >
          <Plus size={14} /> Add New Dish
        </Link>
      }
    >
      <div className="space-y-8">
        {/* ── 4 Single-Purpose Stat Cards ─────────────────────────────── */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-3xl bg-cream p-5 border border-charcoal/10 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-charcoal-70">
              <span>Orders Today</span>
              <Package size={16} className="text-terracotta" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-display text-3xl font-bold text-charcoal tabular-nums">
                {metrics.ordersToday}
              </span>
              <span className="text-xs text-charcoal-70">
                / {metrics.dailyCapacity} max daily
              </span>
            </div>
            <div className="w-full bg-cream-dim rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-terracotta h-full rounded-full"
                style={{ width: `${(metrics.ordersToday / metrics.dailyCapacity) * 100}%` }}
              />
            </div>
          </div>

          <div className="rounded-3xl bg-cream p-5 border border-charcoal/10 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-charcoal-70">
              <span>Available Balance</span>
              <Wallet size={16} className="text-sage" />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xs text-charcoal-70">PKR</span>
              <span className="font-display text-3xl font-bold text-charcoal tabular-nums">
                {metrics.availableBalance.toLocaleString()}
              </span>
            </div>
            <p className="text-[11px] text-sage font-medium flex items-center gap-1">
              <TrendingUp size={12} /> Ready for payout
            </p>
          </div>

          <div className="rounded-3xl bg-cream p-5 border border-charcoal/10 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-charcoal-70">
              <span>Active In-Prep</span>
              <Clock3 size={16} className="text-saffron-dark" />
            </div>
            <span className="font-display text-3xl font-bold text-charcoal tabular-nums block">
              {metrics.activeOrdersCount}
            </span>
            <p className="text-[11px] text-charcoal-70">Requiring kitchen attention</p>
          </div>

          <div className="rounded-3xl bg-cream p-5 border border-charcoal/10 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-charcoal-70">
              <span>Customer Rating</span>
              <Star size={16} className="text-saffron fill-saffron" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-display text-3xl font-bold text-charcoal tabular-nums">
                4.9
              </span>
              <span className="text-xs text-charcoal-70">(128 reviews)</span>
            </div>
            <p className="text-[11px] text-sage font-medium">99% positive feedback</p>
          </div>
        </section>

        {/* ── Active Order Queue ──────────────────────────────────────── */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl text-charcoal flex items-center gap-2">
              <ClipboardList size={20} className="text-terracotta" /> Incoming Order Queue
            </h2>
            <Link
              to="/chef/orders"
              className="text-xs font-semibold text-terracotta hover:underline flex items-center gap-1"
            >
              View Full Queue <ArrowRight size={14} />
            </Link>
          </div>

          <div className="space-y-3">
            {orders.map((order) => {
              const isPending = order.status === 'PENDING'
              const isCooking = order.status === 'PREPARING'
              const isConfirmed = order.status === 'CONFIRMED'

              return (
                <div
                  key={order.id}
                  className="rounded-3xl bg-cream p-5 sm:p-6 border border-charcoal/10 shadow-sm flex flex-wrap items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-xs font-bold text-charcoal bg-cream-dim px-2.5 py-0.5 rounded-lg border border-charcoal/10">
                        #{order.id}
                      </span>
                      <Badge
                        tone={
                          isCooking
                            ? 'warning'
                            : isConfirmed
                              ? 'accent'
                              : isPending
                                ? 'neutral'
                                : 'success'
                        }
                      >
                        {order.status}
                      </Badge>
                      <span className="text-xs text-charcoal-70">
                        For <strong>{order.deliveryDate}</strong>
                      </span>
                    </div>

                    <div>
                      <strong className="text-sm font-bold text-charcoal">
                        {order.customerName}
                      </strong>{' '}
                      <span className="text-xs text-charcoal-70">({order.customerPhone})</span>
                    </div>

                    <div className="text-xs text-charcoal space-y-0.5">
                      {order.items.map((it) => (
                        <div key={it.dishId} className="flex items-center gap-2">
                          <span className="font-bold text-terracotta">{it.quantity}x</span>
                          <span className="font-medium">{it.name}</span>
                        </div>
                      ))}
                    </div>

                    {order.customerNote && (
                      <p className="text-[11px] text-charcoal-70 bg-cream-dim/60 p-2 rounded-xl border border-charcoal/10 italic max-w-lg">
                        "{order.customerNote}"
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-3 shrink-0">
                    <div className="text-right">
                      <span className="font-display text-xl font-bold text-charcoal tabular-nums">
                        {order.currency} {order.total.toLocaleString()}
                      </span>
                      <span className="block text-[10px] text-charcoal-70">
                        {order.paymentMethod === 'STRIPE' ? 'Paid Online' : 'COD'}
                      </span>
                    </div>

                    {order.status !== 'DELIVERED' && order.status !== 'CANCELLED' && (
                      <Button
                        onClick={() => handleAdvanceStatus(order.id, order.status)}
                        className="text-xs py-2 px-4 gap-1.5"
                      >
                        {isPending
                          ? 'Accept & Confirm'
                          : isConfirmed
                            ? 'Start Cooking'
                            : isCooking
                              ? 'Mark Ready'
                              : 'Dispatch Courier'}
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      </div>
    </ChefShell>
  )
}
