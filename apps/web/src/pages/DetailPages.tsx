import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  Check,
  Clock3,
  PauseCircle,
  ShieldCheck,
  UtensilsCrossed,
  ArrowRight,
  ShoppingBag,
} from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Badge } from '../components/atoms/Badge'
import { Button } from '../components/atoms/Button'
import { EmptyState } from '../components/atoms/EmptyState'
import { RatingLine } from '../components/atoms/RatingLine'
import { SaveButton } from '../components/atoms/SaveButton'
import { SectionHeading } from '../components/atoms/SectionHeading'
import { Skeleton } from '../components/atoms/Skeleton'
import { CatalogCard } from '../components/molecules/CatalogCard'
import { ChefAttributionBar } from '../components/molecules/ChefAttributionBar'
import { CartConflictModal } from '../components/molecules/CartConflictModal'
import { DishGallery } from '../components/molecules/DishGallery'
import { KitchenGallery } from '../components/molecules/KitchenGallery'
import { KitchenStory } from '../components/molecules/KitchenStory'
import { PromotionalBanner } from '../components/molecules/PromotionalBanner'
import { Reviews } from '../components/molecules/Reviews'
import { ChefHeroCover } from '../components/organisms/ChefHeroCover'
import { MenuCatalog } from '../components/organisms/MenuCatalog'
import { SignatureDishSpotlight } from '../components/organisms/SignatureDishSpotlight'
import { PageContainer } from '../components/templates/PageContainer'
import { PublicShell } from '../components/templates/PublicShell'
import { addToCart } from '../services/cart'
import {
  discoverChefs,
  discoverDishes,
  discoverMealPlans,
  getChefById,
  getDishById,
  getMediaByIds,
  getMealPlanById,
  listReviewsByTargetId,
  type ChefRecord,
  type DishRecord,
  type MealPlanRecord,
  type ReviewRecord,
} from '../services/api/publicCatalog'

/* ── Shared constants & helpers ─────────────────────────────────────────── */

const fallbackImages = [
  'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1400&q=85',
  'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1400&q=85',
  'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=1400&q=85',
]

const fallbackChef =
  'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=1400&q=85'
const fallbackChefAlt =
  'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=1400&q=85'

function DetailLayout({ children }: { children: ReactNode }) {
  return (
    <PublicShell
      navigation={[
        { label: 'Discover', href: '/discover' },
        { label: 'Chefs', href: '/discover?type=chefs' },
        { label: 'Dishes', href: '/discover?type=dishes' },
        { label: 'Meal plans', href: '/discover?type=meal-plans' },
      ]}
    >
      {children}
    </PublicShell>
  )
}

function mediaUrls(
  ids: readonly string[],
  media: readonly { id: string; url: string }[],
  fallbacks: readonly string[],
) {
  return Array.from(
    new Set(
      [...ids.map((id) => media.find((m) => m.id === id)?.url), ...fallbacks].filter(
        (u): u is string => Boolean(u),
      ),
    ),
  )
}

function resolveKitchenName(chef: ChefRecord): string {
  return (
    ('kitchenName' in chef && (chef as { kitchenName?: string }).kitchenName) ||
    `${chef.displayName}'s Home Kitchen`
  )
}

/* ── 1. CHEF DETAIL PAGE ────────────────────────────────────────────────── */

export function ChefDetailPage() {
  const { chefId = '' } = useParams()
  const navigate = useNavigate()
  const [chef, setChef] = useState<ChefRecord | null>(null)
  const [dishes, setDishes] = useState<DishRecord[]>([])
  const [plans, setPlans] = useState<MealPlanRecord[]>([])
  const [relatedChefs, setRelatedChefs] = useState<ChefRecord[]>([])
  const [reviews, setReviews] = useState<ReviewRecord[]>([])
  const [gallery, setGallery] = useState<string[]>([])
  const [relatedImages, setRelatedImages] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [conflictModalOpen, setConflictModalOpen] = useState(false)
  const [pendingDish, setPendingDish] = useState<{
    chefId: string
    dishId: string
  } | null>(null)

  useEffect(() => {
    let active = true
    getChefById(chefId)
      .then(async (value) => {
        if (!value) return null
        const [reviewRows, dishRows, planRows, chefRows, mediaRows] =
          await Promise.all([
            listReviewsByTargetId(chefId),
            discoverDishes({ chefId, pageSize: 8 }),
            discoverMealPlans({ chefId, pageSize: 6 }),
            discoverChefs({ city: value.serviceArea.city, pageSize: 6 }),
            getMediaByIds(value.portfolioMediaIds),
          ])
        const relatedMediaRows = await getMediaByIds(
          chefRows.data.flatMap((c) => c.portfolioMediaIds),
        )
        if (!active) return value
        setChef(value)
        setReviews(reviewRows)
        setDishes(dishRows.data)
        setPlans(planRows.data)
        setRelatedChefs(chefRows.data.filter((c) => c.id !== value.id))
        setGallery(
          mediaUrls(value.portfolioMediaIds, mediaRows, [
            fallbackChef,
            fallbackChefAlt,
          ]),
        )
        setRelatedImages(
          Object.fromEntries(relatedMediaRows.map((m) => [m.id, m.url])),
        )
        return value
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [chefId])

  if (loading)
    return (
      <DetailLayout>
        <PageContainer>
          <Skeleton className="h-[34rem]" />
        </PageContainer>
      </DetailLayout>
    )

  if (!chef)
    return (
      <DetailLayout>
        <PageContainer>
          <EmptyState
            title="Chef not found"
            description="This kitchen is not available right now."
            action={
              <Link
                to="/discover?type=chefs"
                className="inline-flex min-h-11 items-center rounded-pill bg-terracotta px-5 text-sm font-semibold text-cream"
              >
                Browse chefs
              </Link>
            }
          />
        </PageContainer>
      </DetailLayout>
    )

  const kitchenName = resolveKitchenName(chef)
  const signatureDish = dishes[0]

  const handleOrderDish = (dishId: string, forceReplace = false) => {
    if (!chef) return
    const res = addToCart(chef.id, dishId, forceReplace)
    if (!res.success && res.conflict) {
      setPendingDish({ chefId: chef.id, dishId })
      setConflictModalOpen(true)
    } else {
      navigate('/checkout')
    }
  }

  return (
    <DetailLayout>
      {/* Hero — full bleed cover + profile strip (organism) */}
      <ChefHeroCover
        chef={chef}
        kitchenName={kitchenName}
        coverImage={gallery[0] ?? fallbackChef}
        profileImage={gallery[1] ?? fallbackChefAlt}
      />

      <PageContainer className="pt-6 sm:pt-10 pb-24 space-y-10 sm:space-y-14">
        {/* Offer banner (molecule) */}
        <PromotionalBanner
          code="WELCOME10"
          title="Welcome Offer"
          description={`Use code WELCOME10 at checkout and get 10% off your first order from ${kitchenName}.`}
        />

        {/* Signature dish (organism) */}
        {signatureDish && (
          <SignatureDishSpotlight
            dish={signatureDish}
            image={gallery[0] ?? fallbackImages[1]}
            onOrder={(id) => handleOrderDish(id, false)}
          />
        )}

        {/* Tabbed menu (organism) */}
        <MenuCatalog dishes={dishes} plans={plans} />

        {/* Kitchen gallery — asymmetric masonry (molecule) */}
        <KitchenGallery images={gallery} kitchenName={kitchenName} />

        {/* Kitchen story (molecule) */}
        <KitchenStory kitchenName={kitchenName} chefName={chef.displayName} />

        {/* Reviews */}
        <section className="space-y-5">
          <SectionHeading title="Reviews" />
          <Reviews reviews={reviews} />
        </section>

        {/* Nearby kitchens */}
        {relatedChefs.length > 0 && (
          <section className="space-y-5">
            <SectionHeading eyebrow="Explore More" title="Nearby Kitchens" />
            <div className="grid gap-5 sm:grid-cols-3">
              {relatedChefs.slice(0, 3).map((item) => {
                const img =
                  relatedImages[item.portfolioMediaIds[0]] ?? fallbackChef
                return (
                  <CatalogCard
                    key={item.id}
                    href={`/chefs/${item.id}`}
                    image={img}
                    images={[img, fallbackChefAlt]}
                    title={resolveKitchenName(item)}
                    description={item.bio}
                    meta={`${item.serviceArea.city} · ${item.serviceArea.areas.slice(0, 2).join(', ')}`}
                    rating={item.averageRating}
                    reviewCount={item.totalReviews}
                    tags={item.cuisineSpecialties}
                    eyebrow="Kitchen"
                    status="Available"
                  />
                )
              })}
            </div>
          </section>
        )}

        <CartConflictModal
          open={conflictModalOpen}
          onClose={() => setConflictModalOpen(false)}
          onConfirmReplace={() => {
            setConflictModalOpen(false)
            if (pendingDish) handleOrderDish(pendingDish.dishId, true)
          }}
          existingChefName="your current active cart kitchen"
          newChefName={kitchenName}
        />
      </PageContainer>
    </DetailLayout>
  )
}

/* ── 2. DISH DETAIL PAGE ────────────────────────────────────────────────── */

export function DishDetailPage() {
  const { dishId = '' } = useParams()
  const navigate = useNavigate()
  const [dish, setDish] = useState<DishRecord | null>(null)
  const [chef, setChef] = useState<ChefRecord | null>(null)
  const [reviews, setReviews] = useState<ReviewRecord[]>([])
  const [related, setRelated] = useState<DishRecord[]>([])
  const [images, setImages] = useState<string[]>([])
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(true)
  const [conflictModalOpen, setConflictModalOpen] = useState(false)
  const [pendingAction, setPendingAction] = useState<'add' | 'checkout' | null>(
    null,
  )
  const [existingChefName, setExistingChefName] = useState('')

  useEffect(() => {
    let active = true
    getDishById(dishId)
      .then(async (value) => {
        if (!value) return
        const [chefValue, reviewRows, allDishes, mediaRows] = await Promise.all([
          getChefById(value.chefId),
          listReviewsByTargetId(value.id, 'dish'),
          discoverDishes({ pageSize: 24 }),
          getMediaByIds(value.mediaIds),
        ])
        if (!active) return
        const matches = allDishes.data.filter(
          (d) => d.id !== value.id && d.cuisine === value.cuisine,
        )
        setDish(value)
        setChef(chefValue)
        setReviews(reviewRows)
        setRelated(matches.length ? matches : [value])
        setImages(mediaUrls(value.mediaIds, mediaRows, fallbackImages))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [dishId])

  if (loading)
    return (
      <DetailLayout>
        <PageContainer>
          <Skeleton className="h-[34rem]" />
        </PageContainer>
      </DetailLayout>
    )
  if (!dish)
    return (
      <DetailLayout>
        <PageContainer>
          <EmptyState
            title="Dish not found"
            description="This dish is not available right now."
            action={
              <Link
                to="/discover?type=dishes"
                className="inline-flex min-h-11 items-center rounded-pill bg-terracotta px-5 text-sm font-semibold text-cream"
              >
                Browse dishes
              </Link>
            }
          />
        </PageContainer>
      </DetailLayout>
    )

  const available = dish.status === 'ACTIVE' && dish.availability.isAvailable
  const kitchenName = chef ? resolveKitchenName(chef) : ''

  const handleAddToCart = (forceReplace = false) => {
    if (!dish) return
    const res = addToCart(dish.chefId, dish.id, forceReplace)
    if (!res.success && res.conflict) {
      setExistingChefName('your active cart kitchen')
      setConflictModalOpen(true)
      setPendingAction('add')
    }
  }

  const handleInstantCheckout = (forceReplace = false) => {
    if (!dish) return
    const res = addToCart(dish.chefId, dish.id, forceReplace)
    if (!res.success && res.conflict) {
      setExistingChefName('your active cart kitchen')
      setConflictModalOpen(true)
      setPendingAction('checkout')
    } else {
      navigate('/checkout')
    }
  }

  const handleConfirmReplaceCart = () => {
    setConflictModalOpen(false)
    if (pendingAction === 'checkout') handleInstantCheckout(true)
    else handleAddToCart(true)
  }

  return (
    <DetailLayout>
      <PageContainer className="pb-24 pt-8 sm:pt-12 space-y-12">
        <Link
          to="/discover?type=dishes"
          className="text-sm font-semibold text-charcoal-70 hover:text-terracotta flex items-center gap-1"
        >
          ← Back to dishes
        </Link>

        {/* Header */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Badge tone={available ? 'success' : 'warning'}>
                {available ? 'Available for order' : 'Currently Unavailable'}
              </Badge>
              <span className="text-xs font-semibold text-terracotta-dark bg-terracotta-10 px-3 py-1 rounded-pill">
                {dish.cuisine} · {dish.portionInfo}
              </span>
            </div>
            <SaveButton kind="dish" id={dish.id} />
          </div>

          <h1 className="font-display text-4xl sm:text-5xl leading-tight text-charcoal">
            {dish.name}
          </h1>

          {chef && (
            <ChefAttributionBar
              chefId={chef.id}
              displayName={chef.displayName}
              kitchenName={kitchenName}
              profileImageUrl={fallbackChef}
              city={chef.serviceArea.city}
              areas={chef.serviceArea.areas}
              rating={chef.averageRating}
              reviewCount={chef.totalReviews}
            />
          )}
        </div>

        {/* Gallery + Purchase sidebar */}
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] items-start">
          <DishGallery images={images} title={dish.name} />

          <aside className="space-y-6 sticky top-24">
            <div className="rounded-[2rem] bg-cream-dim/80 p-6 sm:p-8 space-y-6">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-terracotta">
                  Pricing & Order
                </span>
                <div className="mt-1 flex items-baseline gap-3">
                  <span className="font-display text-4xl font-bold tabular-nums text-charcoal">
                    {dish.currency} {dish.price.toLocaleString()}
                  </span>
                  <RatingLine
                    rating={dish.averageRating}
                    count={dish.totalReviews}
                  />
                </div>
                <p className="mt-2 text-sm leading-6 text-charcoal-70">
                  {dish.description}
                </p>
              </div>

              <label
                className="block space-y-2 text-xs font-semibold text-charcoal"
                htmlFor="customer-note"
              >
                <span>Cooking Preference / Customer Note</span>
                <textarea
                  id="customer-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. Please make it mild spicy or deliver with extra green chillies."
                  rows={2}
                  className="w-full resize-none rounded-xl border border-charcoal/15 bg-cream p-3 text-xs font-normal outline-none focus:border-terracotta focus:ring-2 focus:ring-terracotta/15"
                />
              </label>

              <div className="space-y-2.5 pt-2">
                <Button
                  disabled={!available}
                  className="w-full py-3.5 gap-2 text-sm"
                  onClick={() => handleInstantCheckout(false)}
                >
                  <ShoppingBag className="h-4 w-4" /> Order & Checkout Now{' '}
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button
                  disabled={!available}
                  variant="secondary"
                  className="w-full py-3 text-xs"
                  onClick={() => handleAddToCart(false)}
                >
                  Add to Basket
                </Button>
              </div>

              <p className="text-center text-[11px] text-charcoal-70 flex items-center justify-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5 text-sage" /> Orders remain
                scoped to one kitchen for delivery.
              </p>
            </div>
          </aside>
        </div>

        {/* Ingredients & Allergens */}
        <section className="grid gap-8 sm:grid-cols-2">
          <div>
            <SectionHeading eyebrow="Fresh Prep" title="Ingredients" />
            <ul className="mt-4 space-y-0 text-sm text-charcoal-70">
              {dish.ingredients.map((ing) => (
                <li key={ing.name} className="flex justify-between py-2.5">
                  <span className="font-medium text-charcoal">{ing.name}</span>
                  <span>
                    {ing.quantity} {ing.unit}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <SectionHeading eyebrow="Dietary & Safety" title="Dietary & Allergens" />
            <div className="mt-4 flex flex-wrap gap-2">
              {dish.dietaryTags.map((tag) => (
                <Badge key={tag} tone="accent">
                  {tag}
                </Badge>
              ))}
              {dish.allergens.length ? (
                dish.allergens.map((a) => (
                  <Badge key={a} tone="warning">
                    Contains {a}
                  </Badge>
                ))
              ) : (
                <Badge tone="success">No listed allergens</Badge>
              )}
            </div>
            <div className="mt-6 rounded-2xl bg-cream-dim/60 p-4 text-xs leading-5 text-charcoal-70">
              <strong className="text-charcoal block mb-1">
                Serving & Care:
              </strong>
              Best enjoyed fresh. Refrigerate leftover portions promptly and
              consume within 48 hours.
            </div>
          </div>
        </section>

        {/* Related */}
        {related.length > 0 && (
          <section className="space-y-5">
            <SectionHeading eyebrow="More to Explore" title="Related Dishes" />
            <div className="grid gap-5 md:grid-cols-3">
              {related.slice(0, 3).map((item) => (
                <CatalogCard
                  key={item.id}
                  href={`/dishes/${item.id}`}
                  image={fallbackImages[0]}
                  images={fallbackImages}
                  title={item.name}
                  description={item.description}
                  meta={`${item.cuisine} · ${item.portionInfo}`}
                  price={`${item.currency} ${item.price.toLocaleString()}`}
                  rating={item.averageRating}
                  reviewCount={item.totalReviews}
                  tags={item.dietaryTags}
                  eyebrow="Dish"
                  status="Available for order"
                />
              ))}
            </div>
          </section>
        )}

        {/* Reviews */}
        <section className="space-y-5">
          <SectionHeading title="Dish Reviews" />
          <Reviews reviews={reviews} />
        </section>

        <CartConflictModal
          open={conflictModalOpen}
          onClose={() => setConflictModalOpen(false)}
          onConfirmReplace={handleConfirmReplaceCart}
          existingChefName={existingChefName}
          newChefName={kitchenName || chef?.displayName || 'the new kitchen'}
        />
      </PageContainer>
    </DetailLayout>
  )
}

/* ── 3. MEAL PLAN DETAIL PAGE ───────────────────────────────────────────── */

export function MealPlanDetailPage() {
  const { planId = '' } = useParams()
  const navigate = useNavigate()
  const [plan, setPlan] = useState<MealPlanRecord | null>(null)
  const [chef, setChef] = useState<ChefRecord | null>(null)
  const [reviews, setReviews] = useState<ReviewRecord[]>([])
  const [related, setRelated] = useState<MealPlanRecord[]>([])
  const [images, setImages] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [conflictModalOpen, setConflictModalOpen] = useState(false)

  useEffect(() => {
    let active = true
    getMealPlanById(planId)
      .then(async (value) => {
        if (!value) return
        const [chefValue, reviewRows, allPlans, mediaRows] = await Promise.all([
          getChefById(value.chefId),
          listReviewsByTargetId(value.id, 'plan'),
          discoverMealPlans({ chefId: value.chefId, pageSize: 24 }),
          getMediaByIds(value.mediaIds),
        ])
        if (!active) return
        const matches = allPlans.data.filter((p) => p.id !== value.id)
        setPlan(value)
        setChef(chefValue)
        setReviews(reviewRows)
        setRelated(matches.length ? matches : [value])
        setImages(mediaUrls(value.mediaIds, mediaRows, fallbackImages))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [planId])

  if (loading)
    return (
      <DetailLayout>
        <PageContainer>
          <Skeleton className="h-[34rem]" />
        </PageContainer>
      </DetailLayout>
    )
  if (!plan)
    return (
      <DetailLayout>
        <PageContainer>
          <EmptyState
            title="Meal plan not found"
            description="This meal plan is not available right now."
            action={
              <Link
                to="/discover?type=meal-plans"
                className="inline-flex min-h-11 items-center rounded-pill bg-terracotta px-5 text-sm font-semibold text-cream"
              >
                Browse meal plans
              </Link>
            }
          />
        </PageContainer>
      </DetailLayout>
    )

  const active = plan.status === 'ACTIVE'
  const firstDishId = plan.tiers[0]?.dishIds[0] || 'dish-smoky-karahi'
  const kitchenName = chef ? resolveKitchenName(chef) : ''

  const handleStartPlan = (forceReplace = false) => {
    if (!plan) return
    const res = addToCart(plan.chefId, firstDishId, forceReplace)
    if (!res.success && res.conflict) {
      setConflictModalOpen(true)
    } else {
      navigate('/checkout')
    }
  }

  const ruleCards: Array<{ title: string; copy: string; Icon: LucideIcon }> = [
    {
      title: 'Cadence',
      copy: plan.frequency ?? 'One-off',
      Icon: Clock3,
    },
    {
      title: 'Pause Option',
      copy: plan.pauseRules.allowPause
        ? `Up to ${plan.pauseRules.maxPauseDays ?? 30} days`
        : 'Fixed duration',
      Icon: PauseCircle,
    },
    {
      title: 'Skip Window',
      copy: plan.skipRules.allowSkip
        ? `${plan.skipRules.minNoticeHours ?? 72}h notice`
        : 'Fixed schedule',
      Icon: Check,
    },
    {
      title: 'Dish Swap',
      copy: plan.swapRules.allowSwap
        ? `${plan.swapRules.swapWindowHours ?? 72}h window`
        : 'Fixed menu',
      Icon: UtensilsCrossed,
    },
  ]

  return (
    <DetailLayout>
      <PageContainer className="pb-24 pt-8 sm:pt-12 space-y-12">
        <Link
          to="/discover?type=meal-plans"
          className="text-sm font-semibold text-charcoal-70 hover:text-terracotta flex items-center gap-1"
        >
          ← Back to meal plans
        </Link>

        {/* Header */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Badge tone={active ? 'success' : 'neutral'}>
              {active ? 'Accepting Subscriptions' : 'Subscriptions Paused'}
            </Badge>
            <SaveButton kind="plan" id={plan.id} />
          </div>

          <h1 className="font-display text-4xl sm:text-5xl leading-tight text-charcoal">
            {plan.name}
          </h1>

          {chef && (
            <ChefAttributionBar
              chefId={chef.id}
              displayName={chef.displayName}
              kitchenName={kitchenName}
              profileImageUrl={fallbackChef}
              city={chef.serviceArea.city}
              areas={chef.serviceArea.areas}
              rating={chef.averageRating}
              reviewCount={chef.totalReviews}
            />
          )}
        </div>

        {/* Gallery + Plan sidebar */}
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] items-start">
          <DishGallery images={images} title={plan.name} />

          <aside className="space-y-6 sticky top-24">
            <div className="rounded-[2rem] bg-cream-dim/80 p-6 sm:p-8 space-y-6">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-terracotta">
                  Subscription Plan
                </span>
                <div className="mt-1 flex items-baseline gap-3">
                  <span className="font-display text-4xl font-bold tabular-nums text-charcoal">
                    {plan.currency} {plan.basePrice.toLocaleString()}
                  </span>
                  <RatingLine
                    rating={plan.averageRating}
                    count={plan.totalReviews}
                  />
                </div>
                <p className="mt-2 text-sm leading-6 text-charcoal-70">
                  {plan.description}
                </p>
                <p className="mt-2 text-xs font-semibold text-terracotta">
                  Deliveries on{' '}
                  {plan.availabilityRules.availableDays.join(', ')}
                </p>
              </div>

              <Button
                disabled={!active}
                className="w-full py-3.5 gap-2 text-sm"
                onClick={() => handleStartPlan(false)}
              >
                <ShoppingBag className="h-4 w-4" /> Start Plan & Checkout{' '}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </aside>
        </div>

        {/* Tiers */}
        <section className="space-y-5">
          <SectionHeading
            eyebrow="Choose Your Portion"
            title="Subscription Tiers"
          />
          <div className="grid gap-5 md:grid-cols-2">
            {plan.tiers.map((tier) => (
              <div
                key={tier.name}
                className="rounded-2xl bg-cream-dim/70 p-6 space-y-3"
              >
                <div className="flex items-baseline justify-between">
                  <h3 className="font-display text-2xl text-charcoal">
                    {tier.name}
                  </h3>
                  <span className="font-bold text-lg text-terracotta">
                    {plan.currency}{' '}
                    {(tier.priceOverride ?? plan.basePrice).toLocaleString()}
                  </span>
                </div>
                <p className="text-xs leading-5 text-charcoal-70">
                  {tier.description}
                </p>
                <p className="text-xs font-semibold text-charcoal">
                  Serves {tier.portionsPerDish} portions per delivery
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Flexibility rules */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ruleCards.map(({ title, copy, Icon }) => (
            <div
              key={title}
              className="rounded-2xl bg-cream-dim/60 p-4 space-y-1.5"
            >
              <Icon size={18} className="text-terracotta" />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-charcoal-70 block">
                {title}
              </span>
              <span className="text-sm font-semibold text-charcoal block">
                {copy}
              </span>
            </div>
          ))}
        </section>

        {/* Related */}
        {related.length > 0 && (
          <section className="space-y-5">
            <SectionHeading eyebrow="Keep Planning" title="More Meal Plans" />
            <div className="grid gap-5 md:grid-cols-2">
              {related.slice(0, 2).map((item) => (
                <CatalogCard
                  key={item.id}
                  href={`/plans/${item.id}`}
                  image={fallbackImages[2]}
                  images={fallbackImages}
                  title={item.name}
                  description={item.description}
                  meta={`${item.frequency ?? 'One-off'} · ${item.availabilityRules.availableDays.join(', ')}`}
                  price={`${item.currency} ${item.basePrice.toLocaleString()}`}
                  rating={item.averageRating}
                  reviewCount={item.totalReviews}
                  eyebrow="Meal plan"
                  status="Accepting orders"
                />
              ))}
            </div>
          </section>
        )}

        {/* Reviews */}
        <section className="space-y-5">
          <SectionHeading title="Plan Reviews" />
          <Reviews reviews={reviews} />
        </section>

        <CartConflictModal
          open={conflictModalOpen}
          onClose={() => setConflictModalOpen(false)}
          onConfirmReplace={() => {
            setConflictModalOpen(false)
            handleStartPlan(true)
          }}
          existingChefName="your current active cart kitchen"
          newChefName={kitchenName || chef?.displayName || 'the new kitchen'}
        />
      </PageContainer>
    </DetailLayout>
  )
}
