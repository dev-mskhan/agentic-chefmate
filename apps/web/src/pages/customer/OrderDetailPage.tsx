import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  HelpCircle,
  MapPin,
  MessageSquare,
  PackageCheck,
  Star,
  Utensils,
  XCircle,
} from 'lucide-react'
import { PublicShell } from '../../components/templates/PublicShell'
import { PageContainer } from '../../components/templates/PageContainer'
import { Badge } from '../../components/atoms/Badge'
import { Button } from '../../components/atoms/Button'
import { Dropdown } from '../../components/atoms/Dropdown'
import { EmptyState } from '../../components/atoms/EmptyState'
import { Skeleton } from '../../components/atoms/Skeleton'
import { ChatDrawer } from '../../components/molecules/ChatDrawer'
import {
  cancelOrder,
  getOrderById,
  submitOrderDispute,
  submitOrderReview,
  type OrderRecord,
} from '../../services/api/userService'
import { addToCart } from '../../services/cart'

const TIMELINE_STEPS = [
  { status: 'PENDING', label: 'Order Placed', desc: 'Sent to home kitchen' },
  { status: 'CONFIRMED', label: 'Confirmed', desc: 'Chef approved capacity' },
  { status: 'PREPARING', label: 'Cooking', desc: 'Fresh small-batch prep' },
  { status: 'READY', label: 'Packaged', desc: 'Sealed for freshness' },
  { status: 'OUT_FOR_DELIVERY', label: 'On the Way', desc: 'With courier' },
  { status: 'DELIVERED', label: 'Delivered', desc: 'Enjoy your meal' },
]

const DISPUTE_REASONS = [
  { value: 'FOOD_QUALITY', label: 'Food Quality or Temperature Issue' },
  { value: 'MISSING_ITEM', label: 'Missing Dish or Item' },
  { value: 'LATE_DELIVERY', label: 'Significant Delivery Delay (>45 min)' },
  { value: 'PACKAGING_DAMAGED', label: 'Packaging Damaged or Spilled' },
  { value: 'OTHER', label: 'Other Issue with Kitchen' },
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
  const [isChatOpen, setIsChatOpen] = useState(false)

  // Review modal state
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [reviewRating, setReviewRating] = useState(5)
  const [tasteRating, setTasteRating] = useState(5)
  const [packagingRating, setPackagingRating] = useState(5)
  const [deliveryRating, setDeliveryRating] = useState(5)
  const [reviewComment, setReviewComment] = useState('')
  const [submittingReview, setSubmittingReview] = useState(false)

  // Dispute modal state
  const [showDisputeModal, setShowDisputeModal] = useState(false)
  const [disputeReason, setDisputeReason] = useState('FOOD_QUALITY')
  const [disputeNotes, setDisputeNotes] = useState('')
  const [submittingDispute, setSubmittingDispute] = useState(false)

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

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!order || !reviewComment.trim()) return

    setSubmittingReview(true)
    await submitOrderReview(order.id, {
      rating: reviewRating,
      tasteRating,
      packagingRating,
      deliveryRating,
      comment: reviewComment.trim(),
    })
    const updated = await getOrderById(order.id)
    setOrder(updated)
    setSubmittingReview(false)
    setShowReviewModal(false)
  }

  const handleDisputeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!order || !disputeNotes.trim()) return

    setSubmittingDispute(true)
    await submitOrderDispute(order.id, {
      reason: disputeReason,
      notes: disputeNotes.trim(),
    })
    const updated = await getOrderById(order.id)
    setOrder(updated)
    setSubmittingDispute(false)
    setShowDisputeModal(false)
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
  const isDelivered = order.status === 'DELIVERED'
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

            <div className="flex flex-wrap items-center gap-3">
              {/* Message Chef Trigger */}
              <button
                type="button"
                onClick={() => setIsChatOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-pill bg-terracotta text-cream text-xs font-bold hover:bg-terracotta-dark shadow-sm transition-colors cursor-pointer"
              >
                <MessageSquare size={14} /> Message Chef
              </button>

              {/* Order Again */}
              <Button onClick={handleReorder} className="text-xs py-2.5 px-4 gap-1.5 bg-cream text-charcoal border border-charcoal/15 hover:bg-cream-dim">
                <Utensils size={14} /> Order Again
              </Button>

              {/* Review Order Button for Delivered Orders */}
              {isDelivered && !order.review && (
                <button
                  type="button"
                  onClick={() => setShowReviewModal(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-pill bg-saffron text-charcoal text-xs font-bold hover:bg-saffron/90 shadow-2xs transition-colors cursor-pointer"
                >
                  <Star size={14} className="fill-charcoal" /> Leave Review
                </button>
              )}

              {/* Report Issue Button */}
              {isDelivered && !order.dispute && (
                <button
                  type="button"
                  onClick={() => setShowDisputeModal(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-pill bg-cream text-charcoal-70 border border-charcoal/15 text-xs font-semibold hover:border-rust hover:text-rust transition-colors cursor-pointer"
                >
                  <HelpCircle size={14} /> Report Issue
                </button>
              )}

              {/* Cancellation */}
              {canCancel && (
                <button
                  type="button"
                  onClick={() => setShowCancelModal(true)}
                  className="rounded-pill border border-charcoal/15 px-4 py-2 text-xs font-semibold text-charcoal-70 hover:border-terracotta hover:text-terracotta transition-colors cursor-pointer"
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

          {/* Active Dispute Banner if Submitted */}
          {order.dispute && (
            <div className="rounded-2xl bg-saffron/15 p-4 border border-saffron/30 flex items-start gap-3">
              <AlertCircle className="text-saffron shrink-0 mt-0.5" size={18} />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <strong className="text-xs font-bold text-charcoal">
                    Support Issue Ticket #{order.dispute.id}
                  </strong>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-pill bg-saffron text-charcoal">
                    {order.dispute.status}
                  </span>
                </div>
                <p className="text-xs text-charcoal-70 mt-1">
                  Reason: <strong>{order.dispute.reason}</strong> · "{order.dispute.notes}"
                </p>
                <p className="text-[11px] text-charcoal-70/80 mt-1">
                  Our operations team will coordinate with {order.chefName} and follow up within 24 hours.
                </p>
              </div>
            </div>
          )}

          {/* Customer Review Summary Card if already submitted */}
          {order.review && (
            <div className="rounded-2xl bg-cream p-5 border border-charcoal/10 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-sage flex items-center gap-1.5">
                  <PackageCheck size={15} /> Your Review for {order.chefName}
                </span>
                <div className="flex items-center gap-1 text-saffron">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      size={14}
                      className={i < order.review!.rating ? 'fill-saffron text-saffron' : 'text-charcoal/20'}
                    />
                  ))}
                </div>
              </div>
              <p className="text-xs text-charcoal italic leading-relaxed">
                "{order.review.comment}"
              </p>
              <div className="flex items-center gap-4 text-[11px] text-charcoal-70 pt-1 border-t border-charcoal/6">
                <span>Taste: <strong>{order.review.tasteRating ?? 5}/5</strong></span>
                <span>Packaging: <strong>{order.review.packagingRating ?? 5}/5</strong></span>
                <span>Delivery: <strong>{order.review.deliveryRating ?? 5}/5</strong></span>
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

        {/* ── Review Submission Modal (review-service integration) ── */}
        {showReviewModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/50 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="w-full max-w-lg rounded-3xl bg-cream p-6 sm:p-7 border border-charcoal/10 shadow-2xl space-y-5">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-terracotta">
                    Verified Customer Feedback
                  </span>
                  <h3 className="font-display text-2xl text-charcoal">
                    Rate {order.chefName}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowReviewModal(false)}
                  className="text-charcoal-70 hover:text-charcoal p-1"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleReviewSubmit} className="space-y-4 text-xs">
                {/* Overall Star Rating */}
                <div className="space-y-1.5">
                  <label className="font-bold text-charcoal block">Overall Meal Experience</label>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setReviewRating(star)}
                        className="p-1 text-saffron transition-transform hover:scale-110 cursor-pointer"
                      >
                        <Star
                          size={24}
                          className={star <= reviewRating ? 'fill-saffron text-saffron' : 'text-charcoal/20'}
                        />
                      </button>
                    ))}
                    <span className="text-xs font-bold text-charcoal ml-2">
                      {reviewRating === 5 ? 'Exceptional' : reviewRating === 4 ? 'Great' : reviewRating === 3 ? 'Good' : 'Needs Improvement'}
                    </span>
                  </div>
                </div>

                {/* Sub-criteria Ratings */}
                <div className="grid grid-cols-3 gap-2.5 pt-1">
                  <div className="rounded-2xl bg-cream-dim p-2.5 border border-charcoal/8 space-y-1 text-center">
                    <span className="text-[10px] font-bold text-charcoal block">Taste</span>
                    <div className="flex justify-center gap-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setTasteRating(s)}
                          className={`h-6 w-6 rounded-full text-[10px] font-bold ${s === tasteRating ? 'bg-terracotta text-cream' : 'bg-cream text-charcoal'}`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-cream-dim p-2.5 border border-charcoal/8 space-y-1 text-center">
                    <span className="text-[10px] font-bold text-charcoal block">Packaging</span>
                    <div className="flex justify-center gap-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setPackagingRating(s)}
                          className={`h-6 w-6 rounded-full text-[10px] font-bold ${s === packagingRating ? 'bg-terracotta text-cream' : 'bg-cream text-charcoal'}`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-cream-dim p-2.5 border border-charcoal/8 space-y-1 text-center">
                    <span className="text-[10px] font-bold text-charcoal block">Delivery</span>
                    <div className="flex justify-center gap-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setDeliveryRating(s)}
                          className={`h-6 w-6 rounded-full text-[10px] font-bold ${s === deliveryRating ? 'bg-terracotta text-cream' : 'bg-cream text-charcoal'}`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Review Text Area */}
                <div className="space-y-1.5">
                  <label className="font-bold text-charcoal block">Written Review & Highlights</label>
                  <textarea
                    required
                    rows={4}
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="Tell other food lovers about the flavors, spices, portions, and aroma..."
                    className="w-full rounded-2xl bg-cream-dim p-3 border border-charcoal/15 outline-none focus:ring-2 focus:ring-terracotta/20 focus:border-terracotta text-xs"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowReviewModal(false)}
                    className="rounded-pill px-4 py-2 font-semibold text-charcoal-70 hover:bg-cream-dim"
                  >
                    Cancel
                  </button>
                  <Button
                    type="submit"
                    disabled={submittingReview || !reviewComment.trim()}
                    className="bg-terracotta hover:bg-terracotta-dark text-xs py-2 px-5"
                  >
                    {submittingReview ? 'Publishing...' : 'Publish Review'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── Dispute / Refund Modal (admin-service integration) ── */}
        {showDisputeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/50 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="w-full max-w-md rounded-3xl bg-cream p-6 border border-charcoal/10 shadow-2xl space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-rust">
                    Kitchen Resolution Support
                  </span>
                  <h3 className="font-display text-xl text-charcoal">
                    Report an Issue
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDisputeModal(false)}
                  className="text-charcoal-70 hover:text-charcoal p-1"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleDisputeSubmit} className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <label className="font-bold text-charcoal block">Issue Category</label>
                  <Dropdown
                    value={disputeReason}
                    onChange={(val) => setDisputeReason(val)}
                    options={DISPUTE_REASONS}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-charcoal block">Explain what happened</label>
                  <textarea
                    required
                    rows={4}
                    value={disputeNotes}
                    onChange={(e) => setDisputeNotes(e.target.value)}
                    placeholder="Describe any missing dishes, food quality issues, or packaging leaks..."
                    className="w-full rounded-2xl bg-cream-dim p-3 border border-charcoal/15 outline-none focus:ring-2 focus:ring-terracotta/20 focus:border-terracotta text-xs"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowDisputeModal(false)}
                    className="rounded-pill px-4 py-2 font-semibold text-charcoal-70 hover:bg-cream-dim"
                  >
                    Cancel
                  </button>
                  <Button
                    type="submit"
                    disabled={submittingDispute || !disputeNotes.trim()}
                    className="bg-rust hover:bg-rust/90 text-xs py-2 px-4"
                  >
                    {submittingDispute ? 'Submitting...' : 'Submit to Support'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

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

        {/* Direct Chat Drawer */}
        <ChatDrawer
          orderId={order.id}
          currentUserRole="USER"
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
        />
      </PageContainer>
    </PublicShell>
  )
}
