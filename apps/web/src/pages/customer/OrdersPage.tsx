import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Calendar,
  MapPin,
  Package,
  ArrowRight,
} from 'lucide-react'
import { PublicShell } from '../../components/templates/PublicShell'
import { PageContainer } from '../../components/templates/PageContainer'
import { Badge } from '../../components/atoms/Badge'
import { EmptyState } from '../../components/atoms/EmptyState'
import { Skeleton } from '../../components/atoms/Skeleton'
import { getUserOrders, type OrderRecord } from '../../services/api/userService'

function getStatusTone(status: string): 'success' | 'warning' | 'accent' | 'neutral' | 'danger' {
  switch (status) {
    case 'DELIVERED':
      return 'success'
    case 'OUT_FOR_DELIVERY':
    case 'READY':
      return 'accent'
    case 'PREPARING':
    case 'CONFIRMED':
      return 'warning'
    case 'CANCELLED':
      return 'danger'
    default:
      return 'neutral'
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'PENDING':
      return 'Order Received'
    case 'CONFIRMED':
      return 'Chef Confirmed'
    case 'PREPARING':
      return 'Freshly Cooking'
    case 'READY':
      return 'Packaged & Ready'
    case 'OUT_FOR_DELIVERY':
      return 'Out for Delivery'
    case 'DELIVERED':
      return 'Delivered'
    case 'CANCELLED':
      return 'Cancelled'
    default:
      return status
  }
}

export function OrdersPage() {
  const [orders, setOrders] = useState<OrderRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'DELIVERED' | 'CANCELLED'>('ALL')

  useEffect(() => {
    getUserOrders()
      .then((data) => setOrders(data))
      .finally(() => setLoading(false))
  }, [])

  const filteredOrders = orders.filter((order) => {
    if (filter === 'ACTIVE') {
      return ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY'].includes(
        order.status,
      )
    }
    if (filter === 'DELIVERED') return order.status === 'DELIVERED'
    if (filter === 'CANCELLED') return order.status === 'CANCELLED'
    return true
  })

  return (
    <PublicShell>
      <PageContainer className="pb-24 pt-8 sm:pt-12 space-y-8">
        {/* Header Ribbon */}
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-charcoal/10 pb-6">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-terracotta flex items-center gap-1.5">
              <Package size={14} /> Customer Dashboard
            </span>
            <h1 className="font-display text-3xl sm:text-4xl text-charcoal tracking-tight mt-1">
              Your Orders
            </h1>
            <p className="text-xs text-charcoal-70 mt-1">
              Track active meal deliveries, view dish snapshots, and re-order family favorites.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 rounded-pill bg-cream-dim p-1 text-xs font-semibold">
            {(['ALL', 'ACTIVE', 'DELIVERED', 'CANCELLED'] as const).map((tab) => {
              const label =
                tab === 'ALL'
                  ? `All (${orders.length})`
                  : tab === 'ACTIVE'
                    ? `Active (${orders.filter((o) => ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY'].includes(o.status)).length})`
                    : tab === 'DELIVERED'
                      ? `Delivered (${orders.filter((o) => o.status === 'DELIVERED').length})`
                      : `Cancelled (${orders.filter((o) => o.status === 'CANCELLED').length})`

              return (
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
                  {label}
                </button>
              )
            })}
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-44 w-full rounded-2xl" />
            <Skeleton className="h-44 w-full rounded-2xl" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <EmptyState
            title="No orders found"
            description="You don't have any orders under this filter category."
            action={
              <Link
                to="/discover?type=dishes"
                className="inline-flex min-h-11 items-center rounded-pill bg-terracotta px-5 text-sm font-semibold text-cream"
              >
                Browse home dishes
              </Link>
            }
          />
        ) : (
          <div className="space-y-5">
            {filteredOrders.map((order) => {
              return (
                <div
                  key={order.id}
                  className="rounded-3xl border border-charcoal/10 bg-cream p-5 sm:p-6 shadow-sm hover:shadow-md transition-shadow duration-200 space-y-4"
                >
                  {/* Top Bar: Order ID, Date & Status */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-charcoal/10 pb-4">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs font-bold text-charcoal bg-cream-dim px-2.5 py-1 rounded-lg border border-charcoal/10">
                        #{order.id}
                      </span>
                      <span className="text-xs text-charcoal-70 flex items-center gap-1">
                        <Calendar size={13} className="text-terracotta" />
                        Delivery: <strong>{order.deliveryDate}</strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge tone={getStatusTone(order.status)}>
                        {getStatusLabel(order.status)}
                      </Badge>
                      <span className="text-[11px] font-semibold text-charcoal-70">
                        {order.paymentMethod === 'STRIPE' ? 'Paid Online' : 'Cash on Delivery'}
                      </span>
                    </div>
                  </div>

                  {/* Order Details Body */}
                  <div className="grid gap-6 md:grid-cols-[1fr_auto] items-center">
                    <div className="space-y-3">
                      {/* Kitchen Name */}
                      <div>
                        <Link
                          to={`/chefs/${order.chefId}`}
                          className="font-display text-lg font-bold text-charcoal hover:text-terracotta transition-colors"
                        >
                          {order.chefName}
                        </Link>
                        <p className="text-xs text-charcoal-70 flex items-center gap-1 mt-0.5">
                          <MapPin size={12} className="text-terracotta shrink-0" />
                          {order.deliveryAddress.line1}, {order.deliveryAddress.area},{' '}
                          {order.deliveryAddress.city}
                        </p>
                      </div>

                      {/* Items Snapshot summary */}
                      <div className="space-y-1.5">
                        {order.items.map((item) => (
                          <div
                            key={item.dishId}
                            className="flex items-center gap-3 text-xs text-charcoal"
                          >
                            <span className="font-semibold text-terracotta">
                              {item.quantity}x
                            </span>
                            <span className="font-medium truncate max-w-sm">{item.name}</span>
                            <span className="text-charcoal-70">
                              ({order.pricing.currency} {item.price.toLocaleString()})
                            </span>
                          </div>
                        ))}
                      </div>

                      {order.customerNote && (
                        <p className="text-[11px] text-charcoal-70 bg-cream-dim/60 p-2.5 rounded-xl border border-charcoal/10 italic">
                          "{order.customerNote}"
                        </p>
                      )}
                    </div>

                    {/* Right summary and actions */}
                    <div className="flex flex-col items-start md:items-end gap-3 shrink-0 pt-2 md:pt-0">
                      <div className="text-left md:text-right">
                        <span className="block text-[10px] uppercase tracking-wider text-charcoal-70">
                          Total Amount
                        </span>
                        <span className="font-display text-2xl font-bold text-charcoal tabular-nums">
                          {order.pricing.currency} {order.pricing.total.toLocaleString()}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Link
                          to={`/orders/${order.id}`}
                          className="inline-flex min-h-10 items-center gap-1.5 rounded-pill bg-terracotta px-4 py-2 text-xs font-semibold text-cream hover:bg-terracotta-dark transition-colors shadow-sm"
                        >
                          <span>Track & Details</span>
                          <ArrowRight size={14} />
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </PageContainer>
    </PublicShell>
  )
}
