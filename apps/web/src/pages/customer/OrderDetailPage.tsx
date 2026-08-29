import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  MapPin,
  Utensils,
  XCircle,
} from 'lucide-react'
import { PublicShell } from '../../components/templates/PublicShell'
import { PageContainer } from '../../components/templates/PageContainer'
import { Badge } from '../../components/atoms/Badge'
import { Button } from '../../components/atoms/Button'
import { EmptyState } from '../../components/atoms/EmptyState'
import { Skeleton } from '../../components/atoms/Skeleton'
import { cancelOrder, getOrderById, type OrderRecord } from '../../services/api/userService'
import { addToCart } from '../../services/cart'

const TIMELINE_STEPS = [
  { status: 'PENDING', label: 'Order Placed', desc: 'Sent to home kitchen' },
  { status: 'CONFIRMED', label: 'Confirmed', desc: 'Chef approved capacity' },
  { status: 'PREPARING', label: 'Cooking', desc: 'Fresh small-batch prep' },
  { status: 'READY', label: 'Packaged', desc: 'Sealed for freshness' },
  { status: 'OUT_FOR_DELIVERY', label: 'On the Way', desc: 'With courier' },
  { status: 'DELIVERED', label: 'Delivered', desc: 'Enjoy your meal' },
]

function getStepIndex(status: string): number {
  switch (status) {
    case 'PENDING':
      return 0
    case 'CONFIRMED':
      return 1
    case 'PREPARING':
      return 2
    case 'READY':
      return 3
    case 'OUT_FOR_DELIVERY':
      return 4
    case 'DELIVERED':
      return 5
    case 'CANCELLED':
      return -1
    default:
      return 0
  }
}

export function OrderDetailPage() {
  const { orderId = '' } = useParams()
  const navigate = useNavigate()
  const [order, setOrder] = useState<OrderRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [showCancelModal, setShowCancelModal] = useState(false)

  useEffect(() => {
    getOrderById(orderId)
      .then((data) => setOrder(data))
      .finally(() => setLoading(false))
  }, [orderId])

  const handleCancel = async () => {
    if (!order) return
    setCancelling(true)
    await cancelOrder(order.id, cancelReason || 'Customer requested cancellation')
    const updated = await getOrderById(order.id)
    setOrder(updated)
    setCancelling(false)
    setShowCancelModal(false)
  }

  const handleReorder = () => {
    if (!order) return
    order.items.forEach((item) => {
      addToCart(order.chefId, item.dishId, true)
    })
    navigate('/checkout')
  }

  if (loading) {
    return (
      <PublicShell>
        <PageContainer className="pb-24 pt-8 sm:pt-12">
          <Skeleton className="h-96 w-full rounded-3xl" />
        </PageContainer>
      </PublicShell>
    )
  }

  if (!order) {
    return (
      <PublicShell>
        <PageContainer className="pb-24 pt-8 sm:pt-12">
          <EmptyState
            title="Order not found"
            description="We could not find the specified order details."
            action={
              <Link
                to="/orders"
                className="inline-flex min-h-11 items-center rounded-pill bg-terracotta px-5 text-sm font-semibold text-cream"
              >
                Back to all orders
              </Link>
            }
          />
        </PageContainer>
      </PublicShell>
    )
  }

  const currentStep = getStepIndex(order.status)
  const isCancelled = order.status === 'CANCELLED'
  const canCancel = ['PENDING', 'CONFIRMED'].includes(order.status)

  return (
    <PublicShell>
      <PageContainer className="pb-24 pt-8 sm:pt-12 space-y-8">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            to="/orders"
            className="text-xs font-semibold text-charcoal-70 hover:text-terracotta flex items-center gap-1"
          >
            <ArrowLeft size={14} /> Back to all orders
          </Link>
          <span className="font-mono text-xs font-bold text-charcoal bg-cream-dim px-3 py-1 rounded-lg border border-charcoal/10">
            Order #{order.id}
          </span>
        </div>

        {/* Order Header Summary */}
        <div className="rounded-3xl bg-cream-dim p-6 sm:p-8 border border-charcoal/10 shadow-sm space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-terracotta">
                Order Status & Timeline
              </span>
              <h1 className="font-display text-3xl sm:text-4xl text-charcoal">
                {order.chefName}
              </h1>
              <p className="text-xs text-charcoal-70 flex items-center gap-1 pt-1">
                <Calendar size={13} className="text-terracotta" />
                Scheduled Delivery Date:{' '}
                <strong className="text-charcoal">{order.deliveryDate}</strong>
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Button onClick={handleReorder} className="text-xs py-2.5 px-4 gap-1.5">
                <Utensils size={14} /> Order Again
              </Button>
              {canCancel && (
                <button
                  type="button"
                  onClick={() => setShowCancelModal(true)}
                  className="rounded-pill border border-charcoal/15 px-4 py-2 text-xs font-semibold text-charcoal-70 hover:border-terracotta hover:text-terracotta transition-colors"
                >
                  Cancel Order
                </button>
              )}
            </div>
          </div>

          {/* Interactive Progress Timeline */}
          {!isCancelled ? (
            <div className="pt-4 border-t border-charcoal/10">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {TIMELINE_STEPS.map((step, idx) => {
                  const isDone = idx <= currentStep
                  const isCurrent = idx === currentStep

                  return (
                    <div
                      key={step.status}
                      className={`rounded-2xl p-3.5 border transition-all ${
                        isCurrent
                          ? 'bg-cream border-terracotta shadow-md ring-2 ring-terracotta/10'
                          : isDone
                            ? 'bg-cream/60 border-sage/40 text-sage-dark'
                            : 'bg-cream/30 border-charcoal/10 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <CheckCircle2
                          size={16}
                          className={
                            isDone ? (isCurrent ? 'text-terracotta' : 'text-sage') : 'text-charcoal/30'
                          }
                        />
                        <span
                          className={`text-xs font-bold ${
                            isCurrent
                              ? 'text-terracotta'
                              : isDone
                                ? 'text-charcoal'
                                : 'text-charcoal-70'
                          }`}
                        >
                          {step.label}
                        </span>
                      </div>
                      <p className="text-[10px] text-charcoal-70 leading-tight">{step.desc}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl bg-terracotta-10 p-4 border border-terracotta/20 flex items-start gap-3">
              <XCircle className="text-terracotta shrink-0 mt-0.5" size={18} />
              <div>
                <strong className="text-xs font-bold text-terracotta block">
                  This order was cancelled
                </strong>
                <p className="text-xs text-charcoal-70 mt-0.5">
                  Reason: {order.cancellation?.reason || 'Customer request'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Two-column Order Details Grid */}
        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] items-start">
          {/* Left: Items Snapshot list */}
          <div className="space-y-6">
            <div className="rounded-3xl border border-charcoal/10 bg-cream p-6 space-y-4">
              <h2 className="font-display text-xl text-charcoal">Dish Snapshots & Portions</h2>

              <div className="divide-y divide-charcoal/10">
                {order.items.map((item) => (
                  <div
                    key={item.dishId}
                    className="py-4 first:pt-0 last:pb-0 flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3.5">
                      {item.image && (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="h-14 w-14 rounded-2xl object-cover border border-charcoal/10 shrink-0"
                        />
                      )}
                      <div>
                        <h3 className="font-display text-base font-bold text-charcoal leading-tight">
                          {item.name}
                        </h3>
                        <p className="text-xs text-charcoal-70 mt-0.5">
                          {item.cuisine} {item.portionInfo ? `· ${item.portionInfo}` : ''}
                        </p>
                        <span className="inline-block text-xs font-semibold text-terracotta mt-1">
                          Qty: {item.quantity}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="font-display text-lg font-bold text-charcoal tabular-nums">
                        {order.pricing.currency}{' '}
                        {(item.price * item.quantity).toLocaleString()}
                      </span>
                      <span className="block text-[11px] text-charcoal-70">
                        {order.pricing.currency} {item.price.toLocaleString()} each
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {order.customerNote && (
                <div className="rounded-2xl bg-cream-dim p-3.5 border border-charcoal/10 mt-4">
                  <span className="text-[10px] uppercase font-bold text-terracotta tracking-wider block mb-0.5">
                    Cooking Preference / Note
                  </span>
                  <p className="text-xs text-charcoal italic leading-relaxed">
                    "{order.customerNote}"
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right: Delivery & Pricing Summary Sidebar */}
          <aside className="space-y-6">
            {/* Delivery Address Card */}
            <div className="rounded-3xl border border-charcoal/10 bg-cream p-6 space-y-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-terracotta flex items-center gap-1">
                <MapPin size={13} /> Delivery Destination
              </span>
              <div>
                <strong className="text-sm font-bold text-charcoal block">
                  {order.deliveryAddress.label}
                </strong>
                <p className="text-xs text-charcoal-70 mt-1 leading-5">
                  {order.deliveryAddress.line1}
                  <br />
                  {order.deliveryAddress.area}, {order.deliveryAddress.city} -{' '}
                  {order.deliveryAddress.postalCode}
                </p>
              </div>
            </div>

            {/* Price Breakdown */}
            <div className="rounded-3xl border border-charcoal/10 bg-cream p-6 space-y-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-terracotta">
                Payment Summary
              </span>

              <div className="space-y-2 text-xs divide-y divide-charcoal/5 pt-1">
                <div className="flex justify-between py-1 text-charcoal-70">
                  <span>Subtotal</span>
                  <span className="font-semibold text-charcoal tabular-nums">
                    {order.pricing.currency} {order.pricing.subtotal.toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between py-1 text-charcoal-70">
                  <span>Kitchen Delivery Fee</span>
                  <span className="font-semibold text-charcoal tabular-nums">
                    {order.pricing.currency} {order.pricing.deliveryFee.toLocaleString()}
                  </span>
                </div>

                {order.pricing.discountAmount > 0 && (
                  <div className="flex justify-between py-1 text-sage font-semibold">
                    <span>Coupon ({order.pricing.couponCode})</span>
                    <span className="tabular-nums">
                      -{order.pricing.currency}{' '}
                      {order.pricing.discountAmount.toLocaleString()}
                    </span>
                  </div>
                )}

                <div className="flex justify-between py-2 text-sm font-bold text-charcoal border-t border-charcoal/10">
                  <span>Total Paid</span>
                  <span className="font-display text-lg text-terracotta tabular-nums">
                    {order.pricing.currency} {order.pricing.total.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <Badge tone={order.paymentStatus === 'PAID' ? 'success' : 'warning'}>
                  Payment: {order.paymentMethod === 'STRIPE' ? 'Card Paid' : 'Cash on Delivery'}
                </Badge>
              </div>
            </div>
          </aside>
        </div>

        {/* Cancellation Modal */}
        {showCancelModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/50 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="w-full max-w-md rounded-3xl bg-cream p-6 border border-charcoal/10 shadow-2xl space-y-4">
              <h3 className="font-display text-xl text-charcoal">Cancel Order #{order.id}?</h3>
              <p className="text-xs text-charcoal-70 leading-5">
                Please provide a brief reason for cancelling. If already paid online, refunds are automatically processed to your original payment method.
              </p>

              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Reason for cancellation (e.g. Schedule conflict)"
                rows={3}
                className="w-full rounded-2xl border border-charcoal/15 bg-cream-dim p-3 text-xs outline-none focus:border-terracotta"
              />

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCancelModal(false)}
                  className="rounded-pill px-4 py-2 text-xs font-semibold text-charcoal-70 hover:bg-cream-dim"
                >
                  Keep Order
                </button>
                <Button
                  onClick={handleCancel}
                  disabled={cancelling}
                  className="bg-terracotta hover:bg-terracotta-dark text-xs py-2 px-4"
                >
                  {cancelling ? 'Cancelling...' : 'Confirm Cancellation'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </PageContainer>
    </PublicShell>
  )
}
