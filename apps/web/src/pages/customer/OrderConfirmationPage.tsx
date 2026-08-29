import { useEffect, useState } from 'react'
import { CheckCircle2, Clock, MapPin, Calendar, ShoppingBag, ArrowRight, RefreshCw, Banknote, ShieldCheck } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { Badge } from '../../components/atoms/Badge'
import { Button } from '../../components/atoms/Button'
import { PageContainer } from '../../components/templates/PageContainer'
import { PublicShell } from '../../components/templates/PublicShell'
import type { OrderStatusDetails } from '../../features/checkout/types'
import { getOrderStatus } from '../../lib/api/checkout'
import { writeCart } from '../../services/cart'

export function OrderConfirmationPage() {
  const { orderId } = useParams<{ orderId: string }>()
  const targetId = orderId || 'ord-101'

  const [order, setOrder] = useState<OrderStatusDetails | null>(null)
  const [loading, setLoading] = useState(true)

  // Clear local cart upon reaching confirmation screen
  useEffect(() => {
    writeCart(null)
  }, [])

  useEffect(() => {
    let active = true

    const fetchStatus = async () => {
      try {
        const details = await getOrderStatus(targetId)
        if (!active) return
        setOrder(details)
        setLoading(false)

        // Poll if payment status is AWAITING_CONFIRMATION
        if (details.paymentStatus === 'AWAITING_CONFIRMATION') {
          const timer = setTimeout(() => {
            if (active) fetchStatus()
          }, 1500)
          return () => clearTimeout(timer)
        }
      } catch {
        if (active) setLoading(false)
      }
    }

    fetchStatus()

    return () => {
      active = false
    }
  }, [targetId])

  if (loading || !order) {
    return (
      <PublicShell navigation={[{ label: 'Discover', href: '/discover' }]}>
        <PageContainer className="py-20 text-center">
          <RefreshCw className="mx-auto h-8 w-8 animate-spin text-terracotta" />
          <p className="mt-4 text-sm font-medium text-charcoal-70">Loading order confirmation...</p>
        </PageContainer>
      </PublicShell>
    )
  }

  const isPaid = order.paymentStatus === 'PAID'
  const isAwaiting = order.paymentStatus === 'AWAITING_CONFIRMATION'
  const isCod = order.paymentMethod === 'COD'

  return (
    <PublicShell navigation={[{ label: 'Discover', href: '/discover' }]}>
      <PageContainer className="py-12 sm:py-20">
        <div className="mx-auto max-w-3xl">
          {/* Main Status Hero Card */}
          <div className="rounded-[2.5rem] bg-espresso p-8 text-cream shadow-2xl sm:p-12 border border-cream/15">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {isPaid ? (
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-sage text-cream">
                    <CheckCircle2 className="h-7 w-7" />
                  </span>
                ) : isAwaiting ? (
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-saffron/20 text-saffron">
                    <RefreshCw className="h-6 w-6 animate-spin" />
                  </span>
                ) : (
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-terracotta-10 text-terracotta">
                    <Banknote className="h-6 w-6" />
                  </span>
                )}

                <div>
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-saffron">
                    {isPaid ? 'Order Confirmed & Paid' : isAwaiting ? 'Awaiting Payment Confirmation' : 'Order Placed (COD)'}
                  </span>
                  <h1 className="font-display text-3xl sm:text-4xl text-cream mt-0.5">
                    {isPaid
                      ? 'Your order is ready for the chef!'
                      : isAwaiting
                      ? 'Confirming payment with bank...'
                      : 'Cash on delivery recorded'}
                  </h1>
                </div>
              </div>

              {/* Status Badge */}
              {isPaid && <Badge tone="success" className="py-1.5 px-4 text-xs font-bold">PAID ✓</Badge>}
              {isAwaiting && <Badge tone="warning" className="py-1.5 px-4 text-xs font-bold animate-pulse">Awaiting Bank Confirmation</Badge>}
              {isCod && <Badge tone="accent" className="py-1.5 px-4 text-xs font-bold">Cash on Delivery</Badge>}
            </div>

            <p className="mt-4 text-base leading-7 text-cream/70">
              {isPaid
                ? `Thank you for your order with ${order.chefName}. The chef has received your order details.`
                : isAwaiting
                ? 'Your card payment has been authorized client-side. We are awaiting final server confirmation.'
                : `Your order has been sent to ${order.chefName}. Please have exact cash ready upon delivery.`}
            </p>

            {/* Order meta summary grid */}
            <div className="mt-8 grid gap-4 border-t border-cream/15 pt-6 sm:grid-cols-3 text-xs text-cream/80">
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-4 w-4 text-saffron" />
                <div>
                  <span className="block text-cream/50">Order Number</span>
                  <span className="font-mono font-bold text-cream text-sm">{order.orderId}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-saffron" />
                <div>
                  <span className="block text-cream/50">Delivery Date</span>
                  <span className="font-semibold text-cream text-sm">{order.deliveryDate}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-sage" />
                <div>
                  <span className="block text-cream/50">Chef</span>
                  <span className="font-semibold text-cream text-sm">{order.chefName}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Delivery Address & Dish Snapshots Card */}
          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            {/* Address Snapshot */}
            <div className="rounded-2xl border border-charcoal/10 bg-cream p-6">
              <div className="flex items-center gap-2 text-terracotta text-xs font-semibold uppercase tracking-wider mb-2">
                <MapPin className="h-4 w-4" /> Delivery Address Snapshot
              </div>
              <h3 className="font-semibold text-charcoal text-base">{order.addressSnapshot.label}</h3>
              <p className="mt-1 text-sm leading-6 text-charcoal-70">
                {order.addressSnapshot.line1}, {order.addressSnapshot.area}, {order.addressSnapshot.city} {order.addressSnapshot.postalCode}
              </p>
            </div>

            {/* Payment Summary */}
            <div className="rounded-2xl border border-charcoal/10 bg-cream p-6">
              <div className="flex items-center gap-2 text-terracotta text-xs font-semibold uppercase tracking-wider mb-2">
                <Clock className="h-4 w-4" /> Payment Details
              </div>
              <div className="space-y-1.5 text-xs text-charcoal-70">
                <div className="flex justify-between">
                  <span>Method</span>
                  <span className="font-semibold text-charcoal">{order.paymentMethod === 'STRIPE' ? 'Credit Card (Stripe)' : 'Cash on Delivery'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{order.currency} {order.subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery Fee</span>
                  <span>{order.currency} {order.deliveryFee.toLocaleString()}</span>
                </div>
                {order.discountAmount > 0 && (
                  <div className="flex justify-between text-terracotta font-semibold">
                    <span>Discount</span>
                    <span>− {order.currency} {order.discountAmount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-charcoal/10 pt-2 text-sm font-bold text-charcoal">
                  <span>Total Amount</span>
                  <span className="text-terracotta">{order.currency} {order.total.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Dish Snapshots List */}
          <div className="mt-6 rounded-2xl border border-charcoal/10 bg-cream p-6">
            <h3 className="font-display text-lg text-charcoal mb-4">Dish Snapshots ({order.itemsSnapshot.length})</h3>
            <div className="divide-y divide-charcoal/10">
              {order.itemsSnapshot.map((item) => (
                <div key={item.dishId} className="flex items-center justify-between py-3 text-sm">
                  <div className="flex items-center gap-3">
                    {item.image && (
                      <img src={item.image} alt={item.name} className="h-12 w-12 rounded-xl object-cover" />
                    )}
                    <div>
                      <span className="font-semibold text-charcoal block">{item.name}</span>
                      <span className="text-xs text-charcoal-70">
                        {order.currency} {item.price.toLocaleString()} × {item.quantity}
                      </span>
                    </div>
                  </div>
                  <span className="font-semibold text-charcoal">
                    {order.currency} {(item.price * item.quantity).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Action Links */}
          <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
            <Link to="/discover">
              <Button variant="secondary" className="gap-2">
                Browse more food
              </Button>
            </Link>
            <Link to={`/orders/${order.orderId}`}>
              <Button className="gap-2">
                Track order in dashboard <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </PageContainer>
    </PublicShell>
  )
}
