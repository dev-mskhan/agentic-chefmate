import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Button } from '../components/atoms/Button'
import { EmptyState } from '../components/atoms/EmptyState'
import { Skeleton } from '../components/atoms/Skeleton'
import { CatalogCard } from '../components/molecules/CatalogCard'
import { Pagination } from '../components/molecules/Pagination'
import { ThemedSelect, type ThemedSelectOption } from '../components/molecules/ThemedSelect'
import { PageContainer } from '../components/templates/PageContainer'
import { PublicShell } from '../components/templates/PublicShell'
import {
  discoverChefs,
  discoverDishes,
  discoverMealPlans,
  getMediaByIds,
  type ChefRecord,
  type DishRecord,
  type ListResponse,
  type MealPlanRecord,
  type MediaRecord,
} from '../services/api/publicCatalog'

type Mode = 'chefs' | 'dishes' | 'meal-plans'
type Catalog = {
  chefs: ListResponse<ChefRecord>
  dishes: ListResponse<DishRecord>
  plans: ListResponse<MealPlanRecord>
}

const modes: Array<{ value: Mode; label: string; heading: string; description: string }> = [
  { value: 'chefs', label: 'Chefs', heading: 'Chefs near you', description: 'Meet the people preparing food in their own kitchens.' },
  { value: 'dishes', label: 'Dishes', heading: 'Dishes for today', description: 'Choose a dish with clear portions, timing, and availability.' },
  { value: 'meal-plans', label: 'Meal plans', heading: 'Meal plans for the week', description: 'Plan a few meals ahead with a local chef.' },
]

const cityOptions: readonly ThemedSelectOption[] = [
  { value: '', label: 'All cities' },
  { value: 'Lahore', label: 'Lahore' },
  { value: 'Karachi', label: 'Karachi' },
]

const categoryOptions: readonly ThemedSelectOption[] = [
  { value: '', label: 'All categories' },
  { value: 'MAIN_COURSE', label: 'Main course' },
  { value: 'SIDE', label: 'Side' },
]

const statusOptions: readonly ThemedSelectOption[] = [
  { value: '', label: 'All availability' },
  { value: 'ACTIVE', label: 'Available now' },
]

const fallbackImages: Record<string, string> = {
  'media-ayesha-kitchen-01': 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=1200&q=85',
  'media-hamza-kitchen-01': 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=1200&q=85',
  'media-smoky-karahi': 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1200&q=85',
  'media-lemon-rice': 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1200&q=85',
  'media-sunday-plan': 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1200&q=85',
  'media-weeknight-plan': 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1200&q=85',
  'media-family-plan': 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=1200&q=85',
}

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' ? value as Record<string, unknown> : {}
}

function asText(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim() ? value : fallback
}

function asNumber(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function asTextList(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0) : []
}

function formatCategory(category: unknown) {
  const normalized = asText(category, 'Dish category')
  return normalized.replaceAll('_', ' ').toLowerCase().replace(/^\w/, (letter) => letter.toUpperCase())
}

function normalizeChef(record: ChefRecord) {
  const chef = asRecord(record)
  const serviceArea = asRecord(chef.serviceArea)
  return {
    id: asText(chef.id, 'chef'),
    displayName: asText(chef.displayName, 'Local chef'),
    bio: asText(chef.bio, 'Home-cooked food prepared to order.'),
    city: asText(serviceArea.city, 'Nearby'),
    areas: asTextList(serviceArea.areas),
    mediaId: asTextList(chef.portfolioMediaIds)[0] ?? '',
    rating: asNumber(chef.averageRating, 0),
    reviewCount: asNumber(chef.totalReviews, 0),
    specialties: asTextList(chef.cuisineSpecialties),
  }
}

function normalizeDish(record: DishRecord) {
  const dish = asRecord(record)
  const availability = asRecord(dish.availability)
  return {
    id: asText(dish.id, 'dish'),
    name: asText(dish.name ?? dish.title, 'Dish'),
    description: asText(dish.description, 'Prepared by a local chef.'),
    price: asNumber(dish.price, 0),
    currency: asText(dish.currency, 'PKR'),
    category: formatCategory(dish.category),
    cuisine: asText(dish.cuisine, 'Home cooking'),
    portionInfo: asText(dish.portionInfo, 'Portion details on the dish page'),
    dietaryTags: asTextList(dish.dietaryTags),
    mediaId: asTextList(dish.mediaIds)[0] ?? '',
    rating: asNumber(dish.averageRating, 0),
    reviewCount: asNumber(dish.totalReviews, 0),
    available: dish.status === 'ACTIVE' && availability.isAvailable === true,
  }
}

function normalizePlan(record: MealPlanRecord) {
  const plan = asRecord(record)
  const availabilityRules = asRecord(plan.availabilityRules)
  return {
    id: asText(plan.id, 'plan'),
    name: asText(plan.name ?? plan.title, 'Meal plan'),
    description: asText(plan.description, 'A meal plan prepared by a local chef.'),
    price: asNumber(plan.basePrice, 0),
    currency: asText(plan.currency, 'PKR'),
    frequency: asText(plan.frequency, 'One-off'),
    availableDays: asTextList(availabilityRules.availableDays),
    mediaId: asTextList(plan.mediaIds)[0] ?? '',
    rating: asNumber(plan.averageRating, 0),
    reviewCount: asNumber(plan.totalReviews, 0),
  }
}

function LoadingCards() {
  return <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{[1, 2, 3].map((item) => <div key={item} className="overflow-hidden rounded-2xl border border-charcoal/10 bg-cream"><Skeleton className="aspect-[5/3] rounded-none" /><div className="space-y-3 p-4 sm:p-5"><Skeleton className="h-7 w-2/3" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-1/2" /></div></div>)}</div>
}

export function DiscoverPage() {
  const [params, setParams] = useSearchParams()
  const rawType = params.get('type')
  const requestedType = modes.some((mode) => mode.value === rawType) ? rawType as Mode : null
  const visibleModes = requestedType ? modes.filter((mode) => mode.value === requestedType) : modes
  const query = params.get('q') ?? ''
  const city = params.get('city') ?? ''
  const category = params.get('category') ?? ''
  const status = params.get('status') ?? ''
  const page = Number(params.get('page') ?? '1') || 1
  const [search, setSearch] = useState(query)
  const [catalog, setCatalog] = useState<Catalog | null>(null)
  const [media, setMedia] = useState<Record<string, MediaRecord>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let active = true
    const timer = window.setTimeout(() => {
      setLoading(true)
      setError(false)
      const filters = { query, city: city || undefined, category: category || undefined, status: status || undefined, page, pageSize: 3 }
      Promise.all([discoverChefs(filters), discoverDishes(filters), discoverMealPlans(filters)])
        .then(async ([chefs, dishes, plans]) => {
          if (!active) return
          setCatalog({ chefs, dishes, plans })
          const mediaIds = [...chefs.data.flatMap((chef) => { const mediaId = normalizeChef(chef).mediaId; return mediaId ? [mediaId] : [] }), ...dishes.data.flatMap((dish) => { const mediaId = normalizeDish(dish).mediaId; return mediaId ? [mediaId] : [] }), ...plans.data.flatMap((plan) => { const mediaId = normalizePlan(plan).mediaId; return mediaId ? [mediaId] : [] })]
          const mediaRows = await getMediaByIds(mediaIds)
          if (active) setMedia(Object.fromEntries(mediaRows.map((item) => [item.id, item])))
        })
        .catch(() => {
          if (active) setError(true)
        })
        .finally(() => {
          if (active) setLoading(false)
        })
    }, 0)
    return () => { active = false; window.clearTimeout(timer) }
  }, [category, city, page, query, reloadKey, status])

  const navigation = useMemo(() => modes.map((mode) => ({ label: mode.label, href: `/discover?type=${mode.value}` })), [])
  const update = (next: Record<string, string>) => {
    const nextParams = new URLSearchParams(params)
    Object.entries(next).forEach(([key, value]) => value ? nextParams.set(key, value) : nextParams.delete(key))
    if (!('page' in next)) nextParams.delete('page')
    setParams(nextParams)
  }
  const imageFor = (mediaId: string) => media[mediaId]?.url ?? fallbackImages[mediaId] ?? fallbackImages['media-sunday-plan']
  const activeResults = visibleModes.map((mode) => catalog?.[mode.value === 'meal-plans' ? 'plans' : mode.value])
  const hasResults = activeResults.some((result) => Boolean(result?.data.length))
  const hasNext = activeResults.some((result) => Boolean(result?.pageInfo.hasNextPage))
  const currentPage = activeResults.find((result) => result)?.pageInfo.page ?? page
  const totalResults = activeResults.reduce((sum, result) => sum + (result?.pageInfo.total ?? 0), 0)

  function renderChef(chef: ChefRecord) {
    const normalized = normalizeChef(chef)
    return <CatalogCard key={normalized.id} href={`/chefs/${normalized.id}`} image={imageFor(normalized.mediaId)} title={normalized.displayName} description={normalized.bio} meta={`${normalized.city}${normalized.areas.length ? ` / ${normalized.areas.join(', ')}` : ''}`} rating={normalized.rating} reviewCount={normalized.reviewCount} tags={normalized.specialties} eyebrow="Chef" status="Available for orders" />
  }

  function renderDish(dish: DishRecord) {
    const normalized = normalizeDish(dish)
    return <CatalogCard key={normalized.id} href={`/dishes/${normalized.id}`} image={imageFor(normalized.mediaId)} title={normalized.name} description={normalized.description} meta={`${normalized.cuisine} / ${normalized.category} / ${normalized.portionInfo}`} price={`${normalized.currency} ${normalized.price.toLocaleString()}`} rating={normalized.rating} reviewCount={normalized.reviewCount} tags={normalized.dietaryTags} eyebrow="Dish" status={normalized.available ? 'Available to order' : 'Not available'} statusTone={normalized.available ? 'success' : 'warning'} />
  }

  function renderPlan(plan: MealPlanRecord) {
    const normalized = normalizePlan(plan)
    return <CatalogCard key={normalized.id} href={`/plans/${normalized.id}`} image={imageFor(normalized.mediaId)} title={normalized.name} description={normalized.description} meta={`${normalized.frequency}${normalized.availableDays.length ? ` / ${normalized.availableDays.join(', ')}` : ''}`} price={`${normalized.currency} ${normalized.price.toLocaleString()}`} rating={normalized.rating} reviewCount={normalized.reviewCount} eyebrow="Meal plan" status="Accepting orders" />
  }

  function renderModeCards(mode: Mode, result: Catalog['chefs'] | Catalog['dishes'] | Catalog['plans']) {
    if (mode === 'chefs') return result.data.map((chef) => renderChef(chef as ChefRecord))
    if (mode === 'dishes') return result.data.map((dish) => renderDish(dish as DishRecord))
    return result.data.map((plan) => renderPlan(plan as MealPlanRecord))
  }

  return (
    <PublicShell navigation={navigation}>
      <PageContainer className="pb-24 pt-12 sm:pt-16">
        <header className="grid gap-8 border-b border-charcoal/10 pb-10 lg:grid-cols-[1.25fr_0.75fr] lg:items-end">
          <div>
            <p className="max-w-2xl font-display text-5xl leading-[0.95] tracking-[-0.035em] sm:text-6xl">Find food made by chefs near you.</p>
            <p className="mt-5 max-w-xl text-lg leading-8 text-charcoal-70">Browse trusted chefs, current dishes, and meal plans with the details you need to order.</p>
          </div>
          <div className="lg:justify-self-end"><p className="text-sm font-semibold uppercase tracking-[0.16em] text-terracotta">Browse the catalog</p><p className="mt-2 text-sm leading-6 text-charcoal-70">Use the filters, then open a result for availability and ordering details.</p></div>
        </header>

        <nav aria-label="Catalog sections" className="mt-8 flex flex-wrap gap-2">
          <Link to="/discover" className={`rounded-pill px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta ${!requestedType ? 'bg-terracotta text-cream' : 'bg-cream-dim text-charcoal-70 hover:text-charcoal'}`}>All</Link>
          {modes.map((mode) => <Link key={mode.value} to={`/discover?type=${mode.value}`} className={`rounded-pill px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta ${requestedType === mode.value ? 'bg-terracotta text-cream' : 'bg-cream-dim text-charcoal-70 hover:text-charcoal'}`}>{mode.label}</Link>)}
        </nav>

        <form className="mt-6 grid gap-4 rounded-[1.5rem] border border-charcoal/10 bg-cream-dim/60 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_190px_190px_190px_auto] lg:items-end" onSubmit={(event) => { event.preventDefault(); update({ q: search }) }}>
          <label className="grid gap-2 text-sm font-medium">Search<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search chefs, dishes, or plans" className="min-h-12 rounded-xl border border-charcoal/15 bg-cream px-4 outline-none transition-colors placeholder:text-charcoal-70/60 focus:border-terracotta focus:ring-2 focus:ring-terracotta/15" /></label>
          <ThemedSelect label="City" value={city} options={cityOptions} onChange={(value) => update({ city: value })} />
          <ThemedSelect label="Category" value={category} options={categoryOptions} onChange={(value) => update({ category: value })} disabled={Boolean(requestedType && requestedType !== 'dishes')} />
          <ThemedSelect label="Availability" value={status} options={statusOptions} onChange={(value) => update({ status: value })} />
          <Button type="submit" className="min-h-12">Search</Button>
        </form>

        <div className="mt-14" aria-live="polite">
          {loading && <div className="grid gap-14">{visibleModes.map((mode) => <section key={mode.value}><Skeleton className="h-10 w-48" /><div className="mt-5"><LoadingCards /></div></section>)}</div>}
          {!loading && error && <div className="rounded-[1.5rem] border border-rust/30 bg-rust/10 p-6"><h2 className="font-display text-3xl">Results are not available</h2><p className="mt-2 max-w-lg text-sm leading-6 text-charcoal-70">We could not load the catalog. Try again in a moment.</p><Button className="mt-5" onClick={() => setReloadKey((key) => key + 1)}>Try again</Button></div>}
          {!loading && !error && !hasResults && <EmptyState title="No results found" description="Try a different city, category, availability, or search term." action={<Button variant="secondary" onClick={() => { setSearch(''); update({ q: '', city: '', category: '', status: '' }) }}>Clear filters</Button>} />}
          {!loading && !error && catalog && hasResults && <div className="grid gap-16">
            {visibleModes.map((mode) => {
              const result = catalog[mode.value === 'meal-plans' ? 'plans' : mode.value]
              if (!result?.data.length) return null
              return <section key={mode.value} id={mode.value} className="scroll-mt-24">
                <div className="flex flex-wrap items-end justify-between gap-4 border-b border-charcoal/10 pb-5">
                  <div><h2 className="font-display text-4xl leading-none tracking-[-0.025em]">{mode.heading}</h2><p className="mt-3 max-w-xl text-sm leading-6 text-charcoal-70">{mode.description}</p></div>
                  <p className="text-sm text-charcoal-70">{result.pageInfo.total} {mode.label.toLowerCase()}</p>
                </div>
                <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">{renderModeCards(mode.value, result)}</div>
              </section>
            })}
            {(hasNext || currentPage > 1) && <Pagination page={currentPage} hasNext={hasNext} onPrevious={() => update({ page: String(Math.max(1, page - 1)) })} onNext={() => update({ page: String(page + 1) })} />}
            <p className="text-sm text-charcoal-70">{totalResults} results across the catalog</p>
          </div>}
        </div>
      </PageContainer>
    </PublicShell>
  )
}
