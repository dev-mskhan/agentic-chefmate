import { Check, Clock3, Heart, MapPin, PackageCheck, PauseCircle, ShieldCheck, Star, Truck, UtensilsCrossed } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Badge } from '../components/atoms/Badge'
import { Button } from '../components/atoms/Button'
import { EmptyState } from '../components/atoms/EmptyState'
import { Skeleton } from '../components/atoms/Skeleton'
import { CatalogCard } from '../components/molecules/CatalogCard'
import { DishGallery } from '../components/molecules/DishGallery'
import { Reviews } from '../components/molecules/Reviews'
import { PageContainer } from '../components/templates/PageContainer'
import { PublicShell } from '../components/templates/PublicShell'
import { addToCart } from '../services/cart'
import { discoverChefs, discoverDishes, discoverMealPlans, getChefById, getDishById, getMediaByIds, getMealPlanById, listReviewsByTargetId, type ChefRecord, type DishRecord, type MealPlanRecord, type ReviewRecord } from '../services/api/publicCatalog'
import { isSaved, toggleSaved, type SavedKind } from '../services/saved'

const fallbackImages = [
  'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1400&q=85',
  'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1400&q=85',
  'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=1400&q=85',
]

const fallbackChef = 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=1400&q=85'
const fallbackChefAlt = 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=1400&q=85'

function DetailLayout({ children }: { children: ReactNode }) {
  return <PublicShell navigation={[{ label: 'Discover', href: '/discover' }, { label: 'Chefs', href: '/discover?type=chefs' }, { label: 'Dishes', href: '/discover?type=dishes' }, { label: 'Meal plans', href: '/discover?type=meal-plans' }]}>{children}</PublicShell>
}

function SaveButton({ kind, id }: { kind: SavedKind; id: string }) {
  const [saved, setSaved] = useState(() => isSaved(kind, id))
  return <button type="button" onClick={() => setSaved(toggleSaved(kind, id))} aria-pressed={saved} className={`inline-flex min-h-11 items-center gap-2 rounded-pill border px-4 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-terracotta ${saved ? 'border-terracotta bg-terracotta-10 text-terracotta-dark' : 'border-charcoal/15 text-charcoal-70 hover:border-terracotta hover:text-terracotta'}`}><Heart size={16} fill={saved ? 'currentColor' : 'none'} aria-hidden="true" />{saved ? 'Saved' : `Save ${kind === 'plan' ? 'plan' : kind}`}</button>
}

function RatingLine({ rating, count }: { rating: number; count: number }) {
  return <span className="inline-flex items-center gap-1.5 text-sm"><Star size={15} fill="currentColor" className="text-saffron" aria-hidden="true" /><strong>{rating.toFixed(1)}</strong><span className="text-charcoal-70">from {count} reviews</span></span>
}

function SectionTitle({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  return <div className="flex flex-wrap items-end justify-between gap-4"><div>{eyebrow && <p className="text-xs font-semibold uppercase tracking-[0.16em] text-terracotta">{eyebrow}</p>}<h2 className="mt-2 font-display text-3xl tracking-[-0.025em] sm:text-4xl">{title}</h2></div>{children}</div>
}

function mediaUrls(ids: readonly string[], media: readonly { id: string; url: string }[], fallbacks: readonly string[]) {
  return Array.from(new Set([...ids.map((id) => media.find((item) => item.id === id)?.url), ...fallbacks].filter((url): url is string => Boolean(url))))
}

function dishCard(dish: DishRecord, image = fallbackImages[0]) {
  return <CatalogCard key={dish.id} href={`/dishes/${dish.id}`} image={image} images={fallbackImages} title={dish.name} description={dish.description} meta={`${dish.cuisine} / ${dish.portionInfo}`} price={`${dish.currency} ${dish.price.toLocaleString()}`} rating={dish.averageRating} reviewCount={dish.totalReviews} tags={dish.dietaryTags} eyebrow="Dish" status="Available to order" />
}

function planCard(plan: MealPlanRecord, image = fallbackImages[2]) {
  return <CatalogCard key={plan.id} href={`/plans/${plan.id}`} image={image} images={fallbackImages} title={plan.name} description={plan.description} meta={`${plan.frequency ?? 'One-off'} / ${plan.availabilityRules.availableDays.join(', ')}`} price={`${plan.currency} ${plan.basePrice.toLocaleString()}`} rating={plan.averageRating} reviewCount={plan.totalReviews} eyebrow="Meal plan" status="Accepting orders" />
}

export function ChefDetailPage() {
  const { chefId = '' } = useParams()
  const [chef, setChef] = useState<ChefRecord | null>(null)
  const [dishes, setDishes] = useState<DishRecord[]>([])
  const [plans, setPlans] = useState<MealPlanRecord[]>([])
  const [relatedChefs, setRelatedChefs] = useState<ChefRecord[]>([])
  const [reviews, setReviews] = useState<ReviewRecord[]>([])
  const [gallery, setGallery] = useState<string[]>([])
  const [relatedImages, setRelatedImages] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    getChefById(chefId).then(async (value) => {
      if (!value) return null
      const [reviewRows, dishRows, planRows, chefRows, mediaRows] = await Promise.all([
        listReviewsByTargetId(chefId),
        discoverDishes({ chefId, pageSize: 6 }),
        discoverMealPlans({ chefId, pageSize: 6 }),
        discoverChefs({ city: value.serviceArea.city, pageSize: 8 }),
        getMediaByIds(value.portfolioMediaIds),
      ])
      const relatedMediaRows = await getMediaByIds(chefRows.data.flatMap((item) => item.portfolioMediaIds))
      if (!active) return value
      setChef(value)
      setReviews(reviewRows)
      setDishes(dishRows.data)
      setPlans(planRows.data)
      setRelatedChefs(chefRows.data.filter((item) => item.id !== value.id))
      setGallery(mediaUrls(value.portfolioMediaIds, mediaRows, [fallbackChef, fallbackChefAlt]))
      setRelatedImages(Object.fromEntries(relatedMediaRows.map((item) => [item.id, item.url])))
      return value
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [chefId])

  if (loading) return <DetailLayout><PageContainer><Skeleton className="h-[34rem]" /></PageContainer></DetailLayout>
  if (!chef) return <DetailLayout><PageContainer><EmptyState title="Chef not found" description="This kitchen is not available right now." action={<Link to="/discover?type=chefs" className="inline-flex min-h-11 items-center rounded-pill bg-terracotta px-5 text-sm font-semibold text-cream">Browse chefs</Link>} /></PageContainer></DetailLayout>

  return <DetailLayout><PageContainer className="pb-24 pt-8 sm:pt-12">
    <Link to="/discover?type=chefs" className="text-sm font-semibold text-charcoal-70 hover:text-terracotta">← Back to chefs</Link>
    <header className="mt-6 overflow-visible">
      <div className="relative h-56 overflow-hidden rounded-[2rem] bg-cream-dim sm:h-72"><img src={gallery[0] ?? fallbackChef} alt={`${chef.displayName}'s kitchen`} className="h-full w-full object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-charcoal/45 to-transparent" /></div>
      <div className="relative -mt-16 grid gap-6 px-5 sm:-mt-20 sm:grid-cols-[9rem_1fr] sm:items-end sm:px-10">
        <img src={gallery[1] ?? fallbackChefAlt} alt={`${chef.displayName} portrait`} className="h-32 w-32 rounded-[1.5rem] border-4 border-cream object-cover shadow-lg sm:h-40 sm:w-40" />
        <div className="rounded-[1.5rem] bg-cream/95 p-5 backdrop-blur-sm sm:p-7"><div className="flex flex-wrap items-center justify-between gap-3"><Badge tone="success">Available for orders</Badge><SaveButton kind="chef" id={chef.id} /></div><h1 className="mt-4 font-display text-5xl leading-[0.94] tracking-[-0.04em] sm:text-6xl">{chef.displayName}</h1><p className="mt-4 max-w-2xl text-lg leading-8 text-charcoal-70">{chef.bio}</p><div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2"><RatingLine rating={chef.averageRating} count={chef.totalReviews} /><span className="inline-flex items-center gap-1.5 text-sm text-charcoal-70"><MapPin size={15} aria-hidden="true" />{chef.serviceArea.city} · {chef.serviceArea.areas.join(', ')}</span></div></div>
      </div>
    </header>

    <section className="mt-16 grid gap-5 sm:grid-cols-3">
      {[['Kitchen identity', 'Made in small batches, with the pace and care of a home kitchen.'], ['Service area', `${chef.serviceArea.city} delivery within ${chef.serviceArea.radiusKm} km.`], ['Cuisine', chef.cuisineSpecialties.join(' · ')]].map(([title, copy]) => <article key={title} className="rounded-2xl bg-cream-dim/70 p-5"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-terracotta">{title}</p><p className="mt-3 text-sm leading-6 text-charcoal-70">{copy}</p></article>)}
    </section>

    <section className="mt-20"><SectionTitle eyebrow="From the kitchen" title="Order something for the table" /><div className="mt-7 grid gap-5 md:grid-cols-2 lg:grid-cols-3">{dishes.map((dish) => dishCard(dish))}{plans.map((plan) => planCard(plan))}</div>{!dishes.length && !plans.length && <p className="mt-6 text-charcoal-70">New menus are being prepared. Check back soon for the next table.</p>}</section>

    <section className="mt-20 grid gap-8 overflow-hidden rounded-[2rem] bg-terracotta px-6 py-10 text-cream sm:px-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-end"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-cream/70">Warm Hearth offer</p><h2 className="mt-3 max-w-xl font-display text-4xl leading-tight sm:text-5xl">Bring a Lahore kitchen to your table.</h2><p className="mt-4 max-w-xl leading-7 text-cream/80">Order ahead for a generous meal, clear delivery windows, and food that travels from one home kitchen to yours.</p></div><div className="rounded-2xl bg-charcoal/15 p-5"><p className="text-sm font-semibold">A simple order, thoughtfully made</p><div className="mt-4 grid gap-3 text-sm text-cream/80"><p className="flex gap-2"><Check size={17} aria-hidden="true" />Cooked to the chef's schedule</p><p className="flex gap-2"><Check size={17} aria-hidden="true" />Packed for the journey</p><p className="flex gap-2"><Check size={17} aria-hidden="true" />Delivered across the listed service area</p></div></div></section>

    <section className="mt-20 grid gap-10 lg:grid-cols-[1fr_0.8fr]"><div><SectionTitle eyebrow="The person behind the menu" title="A kitchen with standards" /><p className="mt-5 max-w-[62ch] leading-8 text-charcoal-70">Every order starts with ingredients chosen for the day's menu, a tidy prep station, and enough time to finish each dish properly. {chef.displayName} keeps the menu focused so every plate leaves the kitchen at its best.</p><div className="mt-7 grid gap-3 sm:grid-cols-2"><p className="flex gap-3 rounded-xl bg-cream-dim/60 p-4 text-sm"><ShieldCheck className="shrink-0 text-sage" size={19} aria-hidden="true" />Verified chef profile</p><p className="flex gap-3 rounded-xl bg-cream-dim/60 p-4 text-sm"><UtensilsCrossed className="shrink-0 text-terracotta" size={19} aria-hidden="true" />Small-batch preparation</p></div></div><div><SectionTitle title="Delivery notes" /><ul className="mt-5 grid gap-3 text-sm leading-6 text-charcoal-70"><li className="flex gap-3"><Clock3 className="shrink-0 text-terracotta" size={18} aria-hidden="true" />Orders are accepted for the chef's listed days and windows.</li><li className="flex gap-3"><Truck className="shrink-0 text-terracotta" size={18} aria-hidden="true" />Delivery is available across {chef.serviceArea.areas.join(', ')}.</li><li className="flex gap-3"><PackageCheck className="shrink-0 text-terracotta" size={18} aria-hidden="true" />Keep chilled dishes refrigerated on arrival.</li></ul></div></section>

    <section className="mt-20"><SectionTitle eyebrow="A look inside" title="Kitchen gallery" /><div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3">{gallery.slice(0, 3).map((url, index) => <img key={url} src={url} alt={`${chef.displayName} kitchen view ${index + 1}`} className={`w-full rounded-2xl object-cover ${index === 0 ? 'col-span-2 aspect-[2/1] sm:col-span-2' : 'aspect-square'}`} />)}</div></section>
    <section className="mt-20 grid gap-10 lg:grid-cols-[1fr_0.8fr]"><div><SectionTitle title="Reviews" /><div className="mt-6"><Reviews reviews={reviews} /></div></div><div><SectionTitle title="Ordering FAQ" /><div className="mt-6 grid gap-4 text-sm leading-6"><details className="rounded-xl bg-cream-dim/60 p-4"><summary className="cursor-pointer font-semibold">When should I order?</summary><p className="mt-3 text-charcoal-70">Choose a date shown in the dish or plan availability window so the kitchen can prepare your order fresh.</p></details><details className="rounded-xl bg-cream-dim/60 p-4"><summary className="cursor-pointer font-semibold">Can I order more than one dish?</summary><p className="mt-3 text-charcoal-70">Yes. Your basket keeps dishes from one chef together for a smooth delivery.</p></details></div></div></section>
    <section className="mt-20"><SectionTitle eyebrow="Nearby kitchens" title="You may also like" /><div className="mt-7 grid gap-5 md:grid-cols-2">{relatedChefs.slice(0, 2).map((item) => { const image = relatedImages[item.portfolioMediaIds[0]] ?? fallbackChef; return <CatalogCard key={item.id} href={`/chefs/${item.id}`} image={image} images={[image, fallbackChefAlt]} title={item.displayName} description={item.bio} meta={`${item.serviceArea.city} / ${item.serviceArea.areas.join(', ')}`} rating={item.averageRating} reviewCount={item.totalReviews} tags={item.cuisineSpecialties} eyebrow="Chef" status="Available for orders" /> })}</div></section>
  </PageContainer></DetailLayout>
}

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
  const [added, setAdded] = useState(false)

  useEffect(() => {
    let active = true
    getDishById(dishId).then(async (value) => {
      if (!value) return
      const [chefValue, reviewRows, allDishes, mediaRows] = await Promise.all([getChefById(value.chefId), listReviewsByTargetId(value.id, 'dish'), discoverDishes({ pageSize: 24 }), getMediaByIds(value.mediaIds)])
      if (!active) return
      const matches = allDishes.data.filter((item) => item.id !== value.id && item.cuisine === value.cuisine && item.category === value.category)
      setDish(value)
      setChef(chefValue)
      setReviews(reviewRows)
      setRelated(matches.length ? matches : [value])
      setImages(mediaUrls(value.mediaIds, mediaRows, fallbackImages))
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [dishId])

  if (loading) return <DetailLayout><PageContainer><Skeleton className="h-[34rem]" /></PageContainer></DetailLayout>
  if (!dish) return <DetailLayout><PageContainer><EmptyState title="Dish not found" description="This dish is not available right now." action={<Link to="/discover?type=dishes" className="inline-flex min-h-11 items-center rounded-pill bg-terracotta px-5 text-sm font-semibold text-cream">Browse dishes</Link>} /></PageContainer></DetailLayout>
  const available = dish.status === 'ACTIVE' && dish.availability.isAvailable
  const addDish = () => { const result = addToCart(dish.chefId, dish.id); if (result.success) setAdded(true); else navigate('/cart') }

  return <DetailLayout><PageContainer className="pb-24 pt-8 sm:pt-12"><Link to="/discover?type=dishes" className="text-sm font-semibold text-charcoal-70 hover:text-terracotta">← Back to dishes</Link><div className="mt-6 grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-start"><DishGallery images={images} title={dish.name} /><aside className="lg:sticky lg:top-24"><div className="rounded-[2rem] bg-cream-dim/70 p-6 sm:p-8"><div className="flex flex-wrap items-center justify-between gap-3"><Badge tone={available ? 'success' : 'warning'}>{available ? 'Available to order' : 'Not available'}</Badge><SaveButton kind="dish" id={dish.id} /></div><h1 className="mt-5 font-display text-5xl leading-[0.95] tracking-[-0.04em]">{dish.name}</h1><p className="mt-4 leading-7 text-charcoal-70">{dish.description}</p><div className="mt-5 flex flex-wrap items-center gap-4"><span className="font-display text-3xl tabular-nums">{dish.currency} {dish.price.toLocaleString()}</span><RatingLine rating={dish.averageRating} count={dish.totalReviews} /></div><p className="mt-3 text-sm text-charcoal-70">{dish.portionInfo} · {dish.cuisine} · {dish.category}</p><label className="mt-6 grid gap-2 text-sm font-semibold" htmlFor="customer-note">A note for the chef<span className="font-normal text-charcoal-70">Share a preference or serving note.</span><textarea id="customer-note" value={note} onChange={(event) => setNote(event.target.value)} rows={3} className="resize-none rounded-xl border border-charcoal/15 bg-cream p-3 font-normal outline-none focus:border-terracotta focus:ring-2 focus:ring-terracotta/15" /></label><Button disabled={!available} className="mt-5 w-full" onClick={addDish}>{added ? 'Added to basket' : 'Add to basket'}</Button><p className="mt-3 text-center text-xs text-charcoal-70">Your basket stays with one chef for delivery.</p></div></aside></div>
    <section className="mt-20 grid gap-10 lg:grid-cols-[1fr_0.8fr]"><div><SectionTitle eyebrow="What's inside" title="Ingredients and allergens" /><ul className="mt-6 grid gap-3 text-sm text-charcoal-70">{dish.ingredients.map((ingredient) => <li key={ingredient.name} className="flex justify-between gap-4 border-b border-charcoal/10 pb-3"><span>{ingredient.name}</span><span>{ingredient.quantity} {ingredient.unit}</span></li>)}</ul><div className="mt-6 flex flex-wrap gap-2">{dish.dietaryTags.map((tag) => <Badge key={tag} tone="accent">{tag}</Badge>)}{dish.allergens.length ? dish.allergens.map((allergen) => <Badge key={allergen} tone="warning">Contains {allergen}</Badge>) : <Badge tone="success">No listed allergens</Badge>}</div></div><div><SectionTitle title="Serving guidance" /><div className="mt-6 grid gap-4 text-sm leading-6 text-charcoal-70"><p className="rounded-xl bg-cream-dim/60 p-4"><strong className="text-charcoal">Serve</strong><br />Best enjoyed warm with fresh bread or rice.</p><p className="rounded-xl bg-cream-dim/60 p-4"><strong className="text-charcoal">Store</strong><br />Refrigerate promptly and enjoy within two days.</p><p className="rounded-xl bg-cream-dim/60 p-4"><strong className="text-charcoal">Reheat</strong><br />Warm gently on the hob or in short microwave intervals.</p></div></div></section>
    <section className="mt-20 grid gap-10 lg:grid-cols-[1fr_0.8fr]"><div><SectionTitle title="Availability and delivery" /><div className="mt-6 grid gap-3 text-sm text-charcoal-70"><p className="flex gap-3"><Clock3 className="text-terracotta" size={18} aria-hidden="true" />Order between {dish.availability.availableFrom} and {dish.availability.availableUntil}.</p><p className="flex gap-3"><Truck className="text-terracotta" size={18} aria-hidden="true" />Available for delivery on {dish.availability.availableDays.join(', ')}.</p></div></div><div><SectionTitle title="Reviews" /><div className="mt-6"><Reviews reviews={reviews} /></div></div></section>
    {chef && <section className="mt-20 rounded-[2rem] bg-cream-dim/70 p-6 sm:p-8"><div className="flex flex-wrap items-end justify-between gap-5"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-terracotta">From the kitchen</p><h2 className="mt-2 font-display text-4xl">{chef.displayName}</h2><p className="mt-3 max-w-xl leading-7 text-charcoal-70">{chef.bio}</p><p className="mt-4 text-sm text-charcoal-70"><MapPin size={15} className="mr-1 inline" aria-hidden="true" />{chef.serviceArea.city} · {chef.serviceArea.areas.join(', ')}</p></div><Link to={`/chefs/${chef.id}`} className="inline-flex min-h-11 items-center rounded-pill border border-charcoal/15 px-5 text-sm font-semibold hover:border-terracotta hover:text-terracotta">Visit chef profile</Link></div></section>}
    <section className="mt-20"><SectionTitle eyebrow="More to explore" title="Related dishes" /><div className="mt-7 grid gap-5 md:grid-cols-2 lg:grid-cols-3">{related.slice(0, 3).map((item) => dishCard(item))}</div></section>
  </PageContainer></DetailLayout>
}

export function MealPlanDetailPage() {
  const { planId = '' } = useParams()
  const navigate = useNavigate()
  const [plan, setPlan] = useState<MealPlanRecord | null>(null)
  const [chef, setChef] = useState<ChefRecord | null>(null)
  const [reviews, setReviews] = useState<ReviewRecord[]>([])
  const [related, setRelated] = useState<MealPlanRecord[]>([])
  const [images, setImages] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [added, setAdded] = useState(false)

  useEffect(() => {
    let active = true
    getMealPlanById(planId).then(async (value) => {
      if (!value) return
      const [chefValue, reviewRows, allPlans, mediaRows] = await Promise.all([getChefById(value.chefId), listReviewsByTargetId(value.id, 'plan'), discoverMealPlans({ chefId: value.chefId, pageSize: 24 }), getMediaByIds(value.mediaIds)])
      if (!active) return
      const matches = allPlans.data.filter((item) => item.id !== value.id)
      setPlan(value)
      setChef(chefValue)
      setReviews(reviewRows)
      setRelated(matches.length ? matches : [value])
      setImages(mediaUrls(value.mediaIds, mediaRows, fallbackImages))
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [planId])

  if (loading) return <DetailLayout><PageContainer><Skeleton className="h-[34rem]" /></PageContainer></DetailLayout>
  if (!plan) return <DetailLayout><PageContainer><EmptyState title="Meal plan not found" description="This meal plan is not available right now." action={<Link to="/discover?type=meal-plans" className="inline-flex min-h-11 items-center rounded-pill bg-terracotta px-5 text-sm font-semibold text-cream">Browse meal plans</Link>} /></PageContainer></DetailLayout>
  const active = plan.status === 'ACTIVE'
  const firstDishId = plan.tiers[0]?.dishIds[0]
  const purchase = () => { if (firstDishId && addToCart(plan.chefId, firstDishId).success) { setAdded(true); navigate('/cart') } }
  const ruleCards: Array<{ title: string; copy: string; Icon: LucideIcon }> = [
    { title: 'Cadence', copy: plan.frequency ?? 'One-off', Icon: Clock3 },
    { title: 'Pause', copy: plan.pauseRules.allowPause ? `Up to ${plan.pauseRules.maxPauseDays ?? 30} days` : 'Not available', Icon: PauseCircle },
    { title: 'Skip', copy: plan.skipRules.allowSkip ? `${plan.skipRules.minNoticeHours ?? 72} hours notice` : 'Not available', Icon: Check },
    { title: 'Swap', copy: plan.swapRules.allowSwap ? `${plan.swapRules.swapWindowHours ?? 72} hour window` : 'Not available', Icon: UtensilsCrossed },
  ]

  return <DetailLayout><PageContainer className="pb-24 pt-8 sm:pt-12"><Link to="/discover?type=meal-plans" className="text-sm font-semibold text-charcoal-70 hover:text-terracotta">← Back to meal plans</Link><div className="mt-6 grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-start"><DishGallery images={images} title={plan.name} /><aside className="lg:sticky lg:top-24"><div className="rounded-[2rem] bg-cream-dim/70 p-6 sm:p-8"><div className="flex flex-wrap items-center justify-between gap-3"><Badge tone={active ? 'success' : 'neutral'}>{active ? 'Accepting orders' : 'Not accepting orders'}</Badge><SaveButton kind="plan" id={plan.id} /></div><h1 className="mt-5 font-display text-5xl leading-[0.95] tracking-[-0.04em]">{plan.name}</h1><p className="mt-4 leading-7 text-charcoal-70">{plan.description}</p><div className="mt-5 flex flex-wrap items-center gap-4"><span className="font-display text-3xl tabular-nums">{plan.currency} {plan.basePrice.toLocaleString()}</span><RatingLine rating={plan.averageRating} count={plan.totalReviews} /></div><p className="mt-3 text-sm text-charcoal-70">{plan.frequency ?? 'One-off'} · Delivery on {plan.availabilityRules.availableDays.join(', ')}</p><Button disabled={!active || !firstDishId} className="mt-7 w-full" onClick={purchase}>{added ? 'Added to basket' : 'Start this plan'}</Button></div></aside></div>
    <section className="mt-20"><SectionTitle eyebrow="Choose your table" title="Plan tiers" /><div className="mt-7 grid gap-5 md:grid-cols-2">{plan.tiers.map((tier) => <article key={tier.name} className="rounded-2xl border border-charcoal/10 bg-cream p-6"><div className="flex items-start justify-between gap-4"><div><h3 className="font-display text-2xl">{tier.name}</h3><p className="mt-2 text-sm leading-6 text-charcoal-70">{tier.description}</p></div><span className="font-semibold tabular-nums text-terracotta">{plan.currency} {(tier.priceOverride ?? plan.basePrice).toLocaleString()}</span></div><p className="mt-5 text-sm text-charcoal-70">Serves {tier.portionsPerDish} portions per dish{'notes' in tier && tier.notes ? ` · ${tier.notes}` : ''}</p></article>)}</div></section>
    <section className="mt-20 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">{ruleCards.map(({ title, copy, Icon }) => <article key={title} className="rounded-2xl bg-cream-dim/70 p-5"><Icon size={19} className="text-terracotta" aria-hidden="true" /><p className="mt-4 text-xs font-semibold uppercase tracking-[0.12em] text-charcoal-70">{title}</p><p className="mt-2 text-sm font-semibold">{copy}</p></article>)}</section>
    <section className="mt-20 grid gap-10 lg:grid-cols-[1fr_0.8fr]"><div><SectionTitle title="Delivery rhythm" /><div className="mt-6 rounded-2xl bg-terracotta-10 p-6"><p className="flex gap-3 text-sm leading-7 text-charcoal-70"><Truck className="shrink-0 text-terracotta" size={19} aria-hidden="true" />Your table arrives on {plan.availabilityRules.availableDays.join(', ')}. The kitchen confirms the delivery window after checkout.</p><p className="mt-4 flex gap-3 text-sm leading-7 text-charcoal-70"><ShieldCheck className="shrink-0 text-terracotta" size={19} aria-hidden="true" />Capacity is limited to {plan.availabilityRules.maxSubscribers ?? 'a small number of'} tables.</p></div></div><div><SectionTitle title="Reviews" /><div className="mt-6"><Reviews reviews={reviews} /></div></div></section>
    {chef && <section className="mt-20 rounded-[2rem] bg-cream-dim/70 p-6 sm:p-8"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-terracotta">Your chef</p><h2 className="mt-2 font-display text-4xl">{chef.displayName}</h2><p className="mt-3 max-w-xl leading-7 text-charcoal-70">{chef.bio}</p><Link to={`/chefs/${chef.id}`} className="mt-6 inline-flex min-h-11 items-center rounded-pill border border-charcoal/15 px-5 text-sm font-semibold hover:border-terracotta hover:text-terracotta">See the kitchen</Link></section>}
    <section className="mt-20"><SectionTitle eyebrow="Keep planning" title="More meal plans" /><div className="mt-7 grid gap-5 md:grid-cols-2">{related.slice(0, 2).map((item) => planCard(item))}</div></section>
  </PageContainer></DetailLayout>
}
