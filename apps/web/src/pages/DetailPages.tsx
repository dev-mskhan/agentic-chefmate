import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Badge } from '../components/atoms/Badge'
import { Button } from '../components/atoms/Button'
import { EmptyState } from '../components/atoms/EmptyState'
import { Skeleton } from '../components/atoms/Skeleton'
import { PageContainer } from '../components/templates/PageContainer'
import { PublicShell } from '../components/templates/PublicShell'
import { addToCart } from '../services/cart'
import { getChefById, getDishById, getMediaByIds, getMealPlanById, listReviewsByTargetId, type ChefRecord, type DishRecord, type MealPlanRecord, type ReviewRecord } from '../services/api/publicCatalog'

const chefImage = (id: string) => id === 'chef-ayesha-khan' ? 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=1200&q=85' : 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=1200&q=85'
const dishImage = (id: string) => id === 'dish-smoky-karahi' ? 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1200&q=85' : 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1200&q=85'
const planImage = (id: string) => id === 'plan-sunday-dastarkhwan' ? 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1200&q=85' : 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=1200&q=85'

function Reviews({ reviews }: { reviews: ReviewRecord[] }) {
  if (!reviews.length) return <EmptyState title="No published reviews yet" description="Reviews will appear here after customers share their order." />
  return <div className="grid gap-4">{reviews.map((review) => <article key={review.id} className="border-b border-charcoal/10 pb-4"><div className="flex items-center justify-between gap-3"><span className="text-saffron" aria-label={`${review.rating} out of 5 stars`}>{'★'.repeat(review.rating)}<span className="text-charcoal/15">{'★'.repeat(5 - review.rating)}</span></span><time className="text-xs text-charcoal-70">{new Date(review.createdAt).toLocaleDateString('en-PK', { month: 'short', day: 'numeric', year: 'numeric' })}</time></div><p className="mt-2 text-sm leading-6 text-charcoal-70">{review.text}</p></article>)}</div>
}

function DetailLayout({ children }: { children: ReactNode }) {
  return <PublicShell navigation={[{ label: 'Discover', href: '/discover' }, { label: 'Chefs', href: '/discover?type=chefs' }, { label: 'Dishes', href: '/discover?type=dishes' }, { label: 'Meal plans', href: '/discover?type=meal-plans' }, { label: 'Basket', href: '/cart' }]}>{children}</PublicShell>
}

export function ChefDetailPage() {
  const { chefId = '' } = useParams()
  const [chef, setChef] = useState<ChefRecord | null>(null)
  const [reviews, setReviews] = useState<ReviewRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [favorite, setFavorite] = useState(false)
  useEffect(() => { Promise.all([getChefById(chefId), listReviewsByTargetId(chefId)]).then(([value, reviewRows]) => { setChef(value); setReviews(reviewRows) }).finally(() => setLoading(false)) }, [chefId])
  if (loading) return <DetailLayout><PageContainer><Skeleton className="h-[480px]" /></PageContainer></DetailLayout>
  if (!chef) return <DetailLayout><PageContainer><EmptyState title="Chef not found" description="This chef profile is not available." action={<Link to="/discover" className="inline-flex min-h-11 items-center rounded-pill bg-terracotta px-5 text-sm font-semibold text-cream">Browse chefs</Link>} /></PageContainer></DetailLayout>
  return <DetailLayout><PageContainer className="py-10 sm:py-16"><div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center"><img src={chefImage(chef.id)} alt={`${chef.displayName} preparing food`} className="aspect-[4/3] w-full rounded-[2rem] object-cover" /><div><div className="flex items-center justify-between gap-4"><Badge tone="success">Available for orders</Badge><button type="button" onClick={() => setFavorite(!favorite)} aria-pressed={favorite} className="rounded-pill border border-charcoal/15 px-4 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-terracotta">{favorite ? 'Saved' : 'Save chef'}</button></div><h1 className="mt-5 font-display text-5xl leading-[0.95] tracking-[-0.035em]">{chef.displayName}</h1><p className="mt-5 text-lg leading-8 text-charcoal-70">{chef.bio}</p><div className="mt-6 flex flex-wrap gap-2">{chef.cuisineSpecialties.map((tag) => <Badge key={tag} tone="accent">{tag}</Badge>)}</div><p className="mt-6 text-sm text-charcoal-70">{chef.serviceArea.city} · {chef.serviceArea.areas.join(', ')} · {chef.averageRating.toFixed(1)} from {chef.totalReviews} reviews</p><Link to="/discover?type=dishes" className="mt-8 inline-flex min-h-12 items-center rounded-pill bg-terracotta px-6 text-sm font-semibold text-cream hover:bg-terracotta-dark">View dishes</Link></div></div><section className="mt-20 grid gap-10 lg:grid-cols-[1fr_0.7fr]"><div><h2 className="font-display text-3xl">Reviews</h2><div className="mt-6"><Reviews reviews={reviews} /></div></div><div><h2 className="font-display text-3xl">Service area</h2><p className="mt-5 leading-7 text-charcoal-70">Delivery in {chef.serviceArea.city} for homes within {chef.serviceArea.radiusKm} km.</p><div className="mt-5 rounded-2xl bg-cream-dim p-5 text-sm text-charcoal-70">Orders are accepted when the chef is available for your selected date.</div></div></section><section className="mt-16"><h2 className="font-display text-3xl">More from this chef</h2><div className="mt-6"><Link to="/dishes/dish-smoky-karahi" className="inline-flex rounded-pill border border-charcoal/15 px-5 py-3 text-sm font-semibold hover:border-terracotta hover:text-terracotta">View the current dish menu</Link></div></section></PageContainer></DetailLayout>
}

function MediaImage({ id, fallback, alt }: { id: string; fallback: string; alt: string }) {
  const [url, setUrl] = useState(fallback)
  useEffect(() => { getMediaByIds([id]).then((items) => { if (items[0]?.url) setUrl(items[0].url) }) }, [id, fallback])
  return <img src={url} alt={alt} className="aspect-[4/3] w-full rounded-[2rem] object-cover" />
}

export function DishDetailPage() {
  const { dishId = '' } = useParams()
  const navigate = useNavigate()
  const [dish, setDish] = useState<DishRecord | null>(null)
  const [reviews, setReviews] = useState<ReviewRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [favorite, setFavorite] = useState(false)
  const [added, setAdded] = useState(false)
  useEffect(() => { Promise.all([getDishById(dishId), listReviewsByTargetId(dishId, 'dish')]).then(([value, reviewRows]) => { setDish(value); setReviews(reviewRows) }).finally(() => setLoading(false)) }, [dishId])
  if (loading) return <DetailLayout><PageContainer><Skeleton className="h-[480px]" /></PageContainer></DetailLayout>
  if (!dish) return <DetailLayout><PageContainer><EmptyState title="Dish not found" description="This dish is not available." action={<Link to="/discover?type=dishes" className="inline-flex min-h-11 items-center rounded-pill bg-terracotta px-5 text-sm font-semibold text-cream">Browse dishes</Link>} /></PageContainer></DetailLayout>
  const available = dish.status === 'ACTIVE' && dish.availability.isAvailable
  return <DetailLayout><PageContainer className="py-10 sm:py-16"><div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center"><MediaImage id={dish.mediaIds[0]} fallback={dishImage(dish.id)} alt={dish.name} /><div><div className="flex items-center justify-between gap-4"><Badge tone={available ? 'success' : 'warning'}>{available ? 'Available' : 'Not available'}</Badge><button type="button" onClick={() => setFavorite(!favorite)} aria-pressed={favorite} className="rounded-pill border border-charcoal/15 px-4 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-terracotta">{favorite ? 'Saved' : 'Save dish'}</button></div><h1 className="mt-5 font-display text-5xl leading-[0.95] tracking-[-0.035em]">{dish.name}</h1><p className="mt-5 text-lg leading-8 text-charcoal-70">{dish.description}</p><p className="mt-5 font-display text-3xl">{dish.currency} {dish.price.toLocaleString()}</p><p className="mt-2 text-sm text-charcoal-70">{dish.portionInfo} · {dish.cuisine} · {dish.availability.availableFrom}–{dish.availability.availableUntil}</p><div className="mt-6 flex flex-wrap gap-2">{dish.dietaryTags.map((tag) => <Badge key={tag} tone="accent">{tag}</Badge>)}</div><Button disabled={!available} className="mt-8" onClick={() => { addToCart(dish.chefId, dish.id); setAdded(true); navigate('/cart') }}>  {added ? 'Added to basket' : 'Add to basket'}</Button></div></div><section className="mt-20 grid gap-10 lg:grid-cols-[1fr_0.7fr]"><div><h2 className="font-display text-3xl">Ingredients</h2><ul className="mt-5 grid gap-3 text-charcoal-70">{dish.ingredients.map((ingredient) => <li key={ingredient.name} className="flex justify-between border-b border-charcoal/10 pb-3"><span>{ingredient.name}</span><span>{ingredient.quantity} {ingredient.unit}</span></li>)}</ul></div><div><h2 className="font-display text-3xl">Reviews</h2><div className="mt-6"><Reviews reviews={reviews} /></div></div></section><section className="mt-16"><h2 className="font-display text-3xl">Meet the chef</h2><Link to={`/chefs/${dish.chefId}`} className="mt-6 inline-flex rounded-pill border border-charcoal/15 px-5 py-3 text-sm font-semibold hover:border-terracotta hover:text-terracotta">View chef profile</Link></section></PageContainer></DetailLayout>
}

export function MealPlanDetailPage() {
  const { planId = '' } = useParams()
  const navigate = useNavigate()
  const [plan, setPlan] = useState<MealPlanRecord | null>(null)
  const [reviews, setReviews] = useState<ReviewRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [favorite, setFavorite] = useState(false)
  useEffect(() => { Promise.all([getMealPlanById(planId), listReviewsByTargetId(planId, 'plan')]).then(([value, reviewRows]) => { setPlan(value); setReviews(reviewRows) }).finally(() => setLoading(false)) }, [planId])
  if (loading) return <DetailLayout><PageContainer><Skeleton className="h-[480px]" /></PageContainer></DetailLayout>
  if (!plan) return <DetailLayout><PageContainer><EmptyState title="Meal plan not found" description="This meal plan is not available." action={<Link to="/discover?type=meal-plans" className="inline-flex min-h-11 items-center rounded-pill bg-terracotta px-5 text-sm font-semibold text-cream">Browse meal plans</Link>} /></PageContainer></DetailLayout>
  const active = plan.status === 'ACTIVE'
  const firstDishId = plan.tiers[0]?.dishIds[0]
  return <DetailLayout><PageContainer className="py-10 sm:py-16"><div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center"><MediaImage id={plan.mediaIds[0]} fallback={planImage(plan.id)} alt={plan.name} /><div><div className="flex items-center justify-between gap-4"><Badge tone={active ? 'success' : 'neutral'}>{active ? 'Accepting orders' : 'Not accepting orders'}</Badge><button type="button" onClick={() => setFavorite(!favorite)} aria-pressed={favorite} className="rounded-pill border border-charcoal/15 px-4 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-terracotta">{favorite ? 'Saved' : 'Save plan'}</button></div><h1 className="mt-5 font-display text-5xl leading-[0.95] tracking-[-0.035em]">{plan.name}</h1><p className="mt-5 text-lg leading-8 text-charcoal-70">{plan.description}</p><p className="mt-5 font-display text-3xl">{plan.currency} {plan.basePrice?.toLocaleString()}</p><p className="mt-2 text-sm text-charcoal-70">{plan.frequency ?? 'One-off'} · Delivery on {plan.availabilityRules.availableDays.join(', ')}</p><Button disabled={!active || !firstDishId} className="mt-8" onClick={() => { if (firstDishId) { addToCart(plan.chefId, firstDishId); navigate('/cart') } }}>Start with this plan</Button></div></div><section className="mt-20 grid gap-10 lg:grid-cols-[1fr_0.7fr]"><div><h2 className="font-display text-3xl">Plan details</h2><div className="mt-6 grid gap-3 text-sm text-charcoal-70"><p>Serves {plan.tiers[0]?.portionsPerDish ?? 'multiple'} people.</p><p>{plan.pauseRules.allowPause ? 'Pause is available.' : 'Pause is not available.'}</p><p>{plan.skipRules.allowSkip ? 'Skip with advance notice.' : 'Skip is not available.'}</p></div></div><div><h2 className="font-display text-3xl">Reviews</h2><div className="mt-6"><Reviews reviews={reviews} /></div></div></section></PageContainer></DetailLayout>
}
