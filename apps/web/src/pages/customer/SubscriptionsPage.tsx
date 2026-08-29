import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Calendar,
  MapPin,
  PauseCircle,
  PlayCircle,
  RefreshCw,
  Sparkles,
  Utensils,
} from 'lucide-react'
import { PublicShell } from '../../components/templates/PublicShell'
import { PageContainer } from '../../components/templates/PageContainer'
import { Badge } from '../../components/atoms/Badge'
import { Button } from '../../components/atoms/Button'
import { EmptyState } from '../../components/atoms/EmptyState'
import { Skeleton } from '../../components/atoms/Skeleton'
import {
  getUserSubscriptions,
  updateSubscriptionStatus,
  type SubscriptionRecord,
} from '../../services/api/userService'

export function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<SubscriptionRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  useEffect(() => {
    getUserSubscriptions()
      .then((data) => setSubscriptions(data))
      .finally(() => setLoading(false))
  }, [])

  const handleTogglePause = async (sub: SubscriptionRecord) => {
    setUpdatingId(sub.id)
    const nextStatus = sub.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE'
    await updateSubscriptionStatus(sub.id, nextStatus)
    const refreshed = await getUserSubscriptions()
    setSubscriptions(refreshed)
    setUpdatingId(null)
  }

  const handleCancel = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this recurring meal subscription?')) return
    setUpdatingId(id)
    await updateSubscriptionStatus(id, 'CANCELLED')
    const refreshed = await getUserSubscriptions()
    setSubscriptions(refreshed)
    setUpdatingId(null)
  }

  return (
    <PublicShell>
      <PageContainer className="pb-24 pt-8 sm:pt-12 space-y-8">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-charcoal/10 pb-6">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-terracotta flex items-center gap-1.5">
              <RefreshCw size={14} /> Customer Dashboard
            </span>
            <h1 className="font-display text-3xl sm:text-4xl text-charcoal tracking-tight mt-1">
              Meal Subscriptions
            </h1>
            <p className="text-xs text-charcoal-70 mt-1">
              Manage recurring family meal plans, delivery days, and schedule pauses.
            </p>
          </div>

          <Link
            to="/discover?type=meal-plans"
            className="inline-flex min-h-10 items-center gap-1.5 rounded-pill bg-terracotta px-4 py-2 text-xs font-semibold text-cream hover:bg-terracotta-dark transition-colors shadow-sm"
          >
            <Sparkles size={14} /> Browse Meal Plans
          </Link>
        </div>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-44 w-full rounded-3xl" />
            <Skeleton className="h-44 w-full rounded-3xl" />
          </div>
        ) : subscriptions.length === 0 ? (
          <EmptyState
            title="No active subscriptions"
            description="You don't have any recurring home kitchen subscriptions right now."
            action={
              <Link
                to="/discover?type=meal-plans"
                className="inline-flex min-h-11 items-center rounded-pill bg-terracotta px-5 text-sm font-semibold text-cream"
              >
                Browse meal plans
              </Link>
            }
          />
        ) : (
          <div className="space-y-6">
            {subscriptions.map((sub) => {
              const isActive = sub.status === 'ACTIVE'
              const isPaused = sub.status === 'PAUSED'
              const isCancelled = sub.status === 'CANCELLED'

              return (
                <div
                  key={sub.id}
                  className="rounded-3xl border border-charcoal/10 bg-cream p-6 sm:p-8 shadow-sm space-y-6"
                >
                  {/* Top Bar: Plan Name & Status */}
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-charcoal/10 pb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge tone={isActive ? 'success' : isPaused ? 'warning' : 'danger'}>
                          {sub.status}
                        </Badge>
                        <span className="text-xs font-semibold uppercase tracking-wider text-terracotta">
                          {sub.frequency} Cadence
                        </span>
                      </div>
                      <h2 className="font-display text-2xl text-charcoal">{sub.planName}</h2>
                      <p className="text-xs text-charcoal-70 mt-0.5">
                        Prepared by{' '}
                        <Link
                          to={`/chefs/${sub.chefId}`}
                          className="font-semibold text-terracotta hover:underline"
                        >
                          {sub.chefName}
                        </Link>{' '}
                        · {sub.tierName}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] uppercase text-charcoal-70 block">
                        Recurring Amount
                      </span>
                      <span className="font-display text-2xl font-bold text-charcoal tabular-nums">
                        {sub.currency} {sub.basePrice.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Schedule & Selected Dishes Grid */}
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-3">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-charcoal flex items-center gap-1.5">
                        <Calendar size={14} className="text-terracotta" /> Delivery Schedule
                      </h3>
                      <div className="rounded-2xl bg-cream-dim p-4 border border-charcoal/10 space-y-2 text-xs text-charcoal">
                        <div className="flex justify-between">
                          <span className="text-charcoal-70">Delivery Days:</span>
                          <strong className="font-semibold">
                            {sub.schedule.deliveryDays.join(', ')}
                          </strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-charcoal-70">Next Delivery:</span>
                          <strong className="font-semibold text-terracotta">
                            {sub.schedule.nextDeliveryDate}
                          </strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-charcoal-70">Next Billing:</span>
                          <strong className="font-semibold">{sub.schedule.nextBillingDate}</strong>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-charcoal flex items-center gap-1.5">
                        <Utensils size={14} className="text-terracotta" /> Included Dishes
                      </h3>
                      <div className="rounded-2xl bg-cream-dim p-4 border border-charcoal/10 space-y-2 text-xs text-charcoal">
                        {sub.selectedDishes.map((dish) => (
                          <div key={dish.dishId} className="flex justify-between">
                            <span className="font-medium truncate max-w-xs">{dish.name}</span>
                            <span className="font-semibold text-terracotta">
                              {dish.quantity} portion(s)
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Action Controls */}
                  {!isCancelled && (
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-charcoal/10">
                      <div className="flex items-center gap-2 text-xs text-charcoal-70">
                        <MapPin size={13} className="text-terracotta" />
                        Delivering to: {sub.deliveryAddress.label} ({sub.deliveryAddress.area})
                      </div>

                      <div className="flex items-center gap-2">
                        {isActive ? (
                          <Button
                            variant="secondary"
                            onClick={() => handleTogglePause(sub)}
                            disabled={updatingId === sub.id}
                            className="text-xs py-2 px-4 gap-1.5"
                          >
                            <PauseCircle size={14} /> Pause Plan
                          </Button>
                        ) : isPaused ? (
                          <Button
                            onClick={() => handleTogglePause(sub)}
                            disabled={updatingId === sub.id}
                            className="text-xs py-2 px-4 gap-1.5"
                          >
                            <PlayCircle size={14} /> Resume Plan
                          </Button>
                        ) : null}

                        <button
                          type="button"
                          onClick={() => handleCancel(sub.id)}
                          disabled={updatingId === sub.id}
                          className="rounded-pill border border-charcoal/15 px-4 py-2 text-xs font-semibold text-charcoal-70 hover:border-terracotta hover:text-terracotta transition-colors"
                        >
                          Cancel Subscription
                        </button>
                      </div>
                    </div>
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
