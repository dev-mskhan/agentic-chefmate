import { useEffect, useMemo, useState } from 'react'
import { SearchX, SlidersHorizontal } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { Button } from '../components/atoms/Button'
import { EmptyState } from '../components/atoms/EmptyState'
import { Skeleton } from '../components/atoms/Skeleton'
import { CatalogCard } from '../components/molecules/CatalogCard'
import { Pagination } from '../components/molecules/Pagination'
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

const cityOptions = [
  { value: '', label: 'All cities' },
  { value: 'Lahore', label: 'Lahore' },
  { value: 'Karachi', label: 'Karachi' },
]

const categoryOptions = [
  { value: '', label: 'All categories' },
  { value: 'MAIN_COURSE', label: 'Main course' },
  { value: 'SIDE', label: 'Side' },
]

const cuisineOptions = [
  { value: '', label: 'All cuisines' },
  { value: 'Punjabi', label: 'Punjabi' },
  { value: 'Home cooking', label: 'Home cooking' },
  { value: 'Karachi', label: 'Karachi' },
  { value: 'Coastal', label: 'Coastal' },
]

const dietaryOptions = [
  { value: '', label: 'All dietary tags' },
  { value: 'HALAL', label: 'Halal' },
  { value: 'VEGETARIAN', label: 'Vegetarian' },
]

const occasionOptions = [
  { value: '', label: 'All occasions' },
  { value: 'FAMILY', label: 'Family' },
  { value: 'WEEKNIGHT', label: 'Weeknight' },
  { value: 'MEAL_PREP', label: 'Meal prep' },
]

const dayOptions = [
  { value: '', label: 'Any day' },
  { value: 'MON', label: 'Monday' },
  { value: 'TUE', label: 'Tuesday' },
  { value: 'WED', label: 'Wednesday' },
  { value: 'THU', label: 'Thursday' },
  { value: 'FRI', label: 'Friday' },
  { value: 'SAT', label: 'Saturday' },
  { value: 'SUN', label: 'Sunday' },
]

const ratingOptions = [
  { value: '', label: 'Any rating' },
  { value: '4', label: '4.0 and above' },
  { value: '4.5', label: '4.5 and above' },
  { value: '4.8', label: '4.8 and above' },
]

const planTypeOptions = [
  { value: '', label: 'All plan types' },
  { value: 'SUBSCRIPTION', label: 'Subscription' },
  { value: 'ONE_OFF', label: 'One-off' },
]

const frequencyOptions = [
  { value: '', label: 'All frequencies' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'BIWEEKLY', label: 'Every two weeks' },
  { value: 'MONTHLY', label: 'Monthly' },
]

const chefOptions = [
  { value: '', label: 'All chefs' },
  { value: 'chef-ayesha-khan', label: 'Ayesha Khan' },
  { value: 'chef-hamza-malik', label: 'Hamza Malik' },
  { value: 'chef-sana-javed', label: 'Sana Javed' },
  { value: 'chef-mariam-raza', label: 'Mariam Raza' },
]

const fallbackImages: Record<string, string> = {
  'media-ayesha-kitchen-01': 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=1200&q=85',
  'media-hamza-kitchen-01': 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=1200&q=85',
  'media-smoky-karahi': 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1200&q=85',
  'media-lemon-rice': 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1200&q=85',
  'media-sunday-plan': 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1200&q=85',
  'media-weeknight-plan': 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1200&q=85',
  'media-family-plan': 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=1200&q=85',
  'media-sana-kitchen-01': 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=1200&q=85',
  'media-mariam-kitchen-01': 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=1200&q=85',
}

const fallbackImageSets: Record<string, string[]> = {
  'media-smoky-karahi': [
    'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1601050690117-94f5f6fa8bd7?auto=format&fit=crop&w=1200&q=85',
  ],
  'media-sunday-plan': [
    'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=1200&q=85',
  ],
  'media-weeknight-plan': [
    'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=1200&q=85',
  ],
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
    mediaIds: asTextList(dish.mediaIds),
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
    mediaIds: asTextList(plan.mediaIds),
    mediaId: asTextList(plan.mediaIds)[0] ?? '',
    rating: asNumber(plan.averageRating, 0),
    reviewCount: asNumber(plan.totalReviews, 0),
  }
}

function LoadingCards() {
  return <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{[1, 2, 3].map((item) => <div key={item} className="overflow-hidden rounded-2xl border border-charcoal/10 bg-cream"><Skeleton className="aspect-[5/3] rounded-none" /><div className="space-y-3 p-4 sm:p-5"><Skeleton className="h-7 w-2/3" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-1/2" /></div></div>)}</div>
}

function FilterRadios({ label, value, options, onChange, disabled = false }: { label: string; value: string; options: readonly { value: string; label: string }[]; onChange: (value: string) => void; disabled?: boolean }) {
  return <fieldset className={`grid gap-2 ${disabled ? 'opacity-45' : ''}`} disabled={disabled}>
    <legend className="text-xs font-semibold uppercase tracking-[0.12em] text-charcoal-70">{label}</legend>
    <div className="grid gap-1">
      {options.map((option) => <label key={option.value} className="flex min-h-9 cursor-pointer items-center gap-2 rounded-lg px-2 text-sm text-charcoal transition-colors hover:bg-cream hover:text-terracotta has-[:checked]:bg-cream has-[:checked]:font-semibold has-[:checked]:text-charcoal">
        <input type="radio" name={label} value={option.value} checked={value === option.value} onChange={() => onChange(option.value)} className="h-3.5 w-3.5 accent-terracotta" />
        <span>{option.label}</span>
      </label>)}
    </div>
  </fieldset>
}

function FilterChecks({ label, value, options, onChange, disabled = false }: { label: string; value: string; options: readonly { value: string; label: string }[]; onChange: (value: string) => void; disabled?: boolean }) {
  const selected = value.split(',').filter(Boolean)
  return <fieldset className={`grid gap-2 ${disabled ? 'opacity-45' : ''}`} disabled={disabled}>
    <legend className="text-xs font-semibold uppercase tracking-[0.12em] text-charcoal-70">{label}</legend>
    <div className="grid gap-1">
      {options.map((option) => <label key={option.value} className="flex min-h-9 cursor-pointer items-center gap-2 rounded-lg px-2 text-sm text-charcoal transition-colors hover:bg-cream hover:text-terracotta has-[:checked]:bg-cream has-[:checked]:font-semibold">
        <input type="checkbox" checked={selected.includes(option.value)} onChange={() => onChange(option.value)} className="h-3.5 w-3.5 rounded accent-terracotta" />
        <span>{option.label}</span>
      </label>)}
    </div>
  </fieldset>
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
  const cuisine = params.get('cuisine') ?? ''
  const dietaryTag = params.get('dietaryTag') ?? ''
  const occasion = params.get('occasion') ?? ''
  const excludeAllergen = params.get('excludeAllergen') ?? ''
  const minPrice = params.get('minPrice') ?? ''
  const maxPrice = params.get('maxPrice') ?? ''
  const minRating = params.get('minRating') ?? ''
  const availableDay = params.get('availableDay') ?? ''
  const chefId = params.get('chefId') ?? ''
  const planType = params.get('planType') ?? ''
  const frequency = params.get('frequency') ?? ''
  const page = Number(params.get('page') ?? '1') || 1
  const [search, setSearch] = useState(query)
  const [catalog, setCatalog] = useState<Catalog | null>(null)
  const [media, setMedia] = useState<Record<string, MediaRecord>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [filtersOpen, setFiltersOpen] = useState(false)

  useEffect(() => {
    let active = true
    const timer = window.setTimeout(() => {
      setLoading(true)
      setError(false)
      const filters = {
        query, city: city || undefined, category: category || undefined, status: status || undefined,
        cuisine: cuisine || undefined, dietaryTag: dietaryTag || undefined, occasion: occasion || undefined,
        excludeAllergen: excludeAllergen || undefined, minPrice: minPrice ? Number(minPrice) : undefined,
        maxPrice: maxPrice ? Number(maxPrice) : undefined, minRating: minRating ? Number(minRating) : undefined,
        availableDay: availableDay || undefined, chefId: chefId || undefined, planType: planType || undefined,
        frequency: frequency || undefined, page, pageSize: 3,
      }
      Promise.all([discoverChefs(filters), discoverDishes(filters), discoverMealPlans(filters)])
        .then(async ([chefs, dishes, plans]) => {
          if (!active) return
          setCatalog({ chefs, dishes, plans })
          const mediaIds = [...chefs.data.flatMap((chef) => { const mediaId = normalizeChef(chef).mediaId; return mediaId ? [mediaId] : [] }), ...dishes.data.flatMap((dish) => normalizeDish(dish).mediaIds), ...plans.data.flatMap((plan) => normalizePlan(plan).mediaIds)]
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
  }, [availableDay, category, chefId, city, cuisine, dietaryTag, excludeAllergen, frequency, maxPrice, minPrice, minRating, occasion, page, planType, query, reloadKey, status])

  const navigation = useMemo(() => modes.map((mode) => ({ label: mode.label, href: `/discover?type=${mode.value}` })), [])
  const update = (next: Record<string, string>) => {
    const nextParams = new URLSearchParams(params)
    Object.entries(next).forEach(([key, value]) => value ? nextParams.set(key, value) : nextParams.delete(key))
    if (!('page' in next)) nextParams.delete('page')
    setParams(nextParams)
  }
  const toggleMulti = (key: string, value: string) => {
    const selected = (params.get(key) ?? '').split(',').filter(Boolean)
    const next = selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value]
    update({ [key]: next.join(',') })
  }
  const imageFor = (mediaId: string) => media[mediaId]?.url ?? fallbackImages[mediaId] ?? fallbackImages['media-sunday-plan']
  const imagesFor = (mediaId: string) => Array.from(new Set([media[mediaId]?.url, ...(fallbackImageSets[mediaId] ?? []), fallbackImages[mediaId]].filter((value): value is string => Boolean(value))))
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
    return <CatalogCard key={normalized.id} href={`/dishes/${normalized.id}`} image={imageFor(normalized.mediaId)} images={imagesFor(normalized.mediaId)} title={normalized.name} description={normalized.description} meta={`${normalized.cuisine} / ${normalized.category} / ${normalized.portionInfo}`} price={`${normalized.currency} ${normalized.price.toLocaleString()}`} rating={normalized.rating} reviewCount={normalized.reviewCount} tags={normalized.dietaryTags} eyebrow="Dish" status={normalized.available ? 'Available to order' : 'Not available'} statusTone={normalized.available ? 'success' : 'warning'} />
  }

  function renderPlan(plan: MealPlanRecord) {
    const normalized = normalizePlan(plan)
    return <CatalogCard key={normalized.id} href={`/plans/${normalized.id}`} image={imageFor(normalized.mediaId)} images={imagesFor(normalized.mediaId)} title={normalized.name} description={normalized.description} meta={`${normalized.frequency}${normalized.availableDays.length ? ` / ${normalized.availableDays.join(', ')}` : ''}`} price={`${normalized.currency} ${normalized.price.toLocaleString()}`} rating={normalized.rating} reviewCount={normalized.reviewCount} eyebrow="Meal plan" status="Accepting orders" />
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

        <div className="mt-6 grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-10 lg:items-start">
          <div className="min-w-0 lg:sticky lg:top-24 lg:h-[calc(100vh-7rem)] lg:self-start lg:overflow-hidden">
            <label className="grid gap-2 text-sm font-medium">Search<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Chefs, dishes, plans" className="min-h-11 rounded-xl border border-charcoal/15 bg-cream px-3 text-sm outline-none placeholder:text-charcoal-70/60 focus:border-terracotta focus:ring-2 focus:ring-terracotta/15" /></label>
            <button type="button" className="mt-3 flex min-h-11 w-full items-center justify-between rounded-xl border border-charcoal/10 bg-cream-dim/70 px-4 text-sm font-semibold lg:hidden" aria-expanded={filtersOpen} onClick={() => setFiltersOpen((open) => !open)}><span className="flex items-center gap-2 text-terracotta"><SlidersHorizontal size={16} aria-hidden="true" /> Filters</span><span aria-hidden="true" className={`h-2.5 w-2.5 rotate-45 border-b-2 border-r-2 border-terracotta transition-transform ${filtersOpen ? 'rotate-[225deg]' : '-translate-y-1'}`} /></button>

            {/*
              Outer wrapper owns the SHAPE: rounded corners, border, background,
              and `overflow-hidden`. Because it doesn't scroll itself, its
              overflow-hidden clips everything inside it — including the inner
              form's native scrollbar — to the rounded rect. This is what fixes
              the bottom-right corner getting cut off by a square scrollbar.
              Visibility toggling (mobile open/close) also lives here so a
              closed panel takes up no space, same as before.
            */}
            <div
              className={`${filtersOpen ? 'block' : 'hidden'} mt-3 h-[28rem] overflow-hidden rounded-[1.5rem] border border-charcoal/10 bg-cream-dim/60 lg:block lg:h-[calc(100%_-_4.5rem)]`}
            >
              {/* Inner element owns the SCROLL: it's the one with overflow-y-auto,
                  full height/width of the wrapper, and the custom scrollbar class. */}
              <form
                className="filter-scrollbar grid h-full min-w-0 gap-5 overflow-y-auto overflow-x-hidden p-4 sm:grid-cols-2 sm:p-5 lg:block lg:space-y-5"
                onSubmit={(event) => { event.preventDefault(); update({ q: search }); setFiltersOpen(false) }}
              >
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-terracotta sm:col-span-2 lg:mb-2"><SlidersHorizontal size={15} aria-hidden="true" /> Filters</div>
                <FilterRadios label="City" value={city} options={cityOptions} onChange={(value) => update({ city: value })} />
                <FilterChecks label="Cuisine" value={cuisine} options={cuisineOptions.filter((option) => option.value)} onChange={(value) => toggleMulti('cuisine', value)} />
                <FilterChecks label="Available day" value={availableDay} options={dayOptions.filter((option) => option.value)} onChange={(value) => toggleMulti('availableDay', value)} />
                <FilterRadios label="Rating" value={minRating} options={ratingOptions} onChange={(value) => update({ minRating: value })} />
                <FilterRadios label="Category" value={category} options={categoryOptions} onChange={(value) => update({ category: value })} disabled={Boolean(requestedType && requestedType !== 'dishes')} />
                <FilterChecks label="Dietary" value={dietaryTag} options={dietaryOptions.filter((option) => option.value)} onChange={(value) => toggleMulti('dietaryTag', value)} disabled={Boolean(requestedType && requestedType !== 'dishes')} />
                <FilterChecks label="Occasion" value={occasion} options={occasionOptions.filter((option) => option.value)} onChange={(value) => toggleMulti('occasion', value)} disabled={Boolean(requestedType && requestedType !== 'dishes')} />
                <FilterRadios label="Chef" value={chefId} options={chefOptions} onChange={(value) => update({ chefId: value })} disabled={Boolean(requestedType === 'chefs')} />
                <FilterRadios label="Plan type" value={planType} options={planTypeOptions} onChange={(value) => update({ planType: value })} disabled={Boolean(requestedType && requestedType !== 'meal-plans')} />
                <FilterRadios label="Frequency" value={frequency} options={frequencyOptions} onChange={(value) => update({ frequency: value })} disabled={Boolean(requestedType && requestedType !== 'meal-plans')} />
                <div className="grid grid-cols-1 gap-3 sm:col-span-2">
                  <label className="grid min-w-0 gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-charcoal-70">Min price<input inputMode="numeric" value={minPrice} onChange={(event) => update({ minPrice: event.target.value.replace(/\D/g, '') })} placeholder="0" className="min-h-10 min-w-0 w-full rounded-xl border border-charcoal/15 bg-cream px-3 text-sm font-normal normal-case tracking-normal outline-none focus:border-terracotta focus:ring-2 focus:ring-terracotta/15" disabled={Boolean(requestedType === 'chefs')} /></label>
                  <label className="grid min-w-0 gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-charcoal-70">Max price<input inputMode="numeric" value={maxPrice} onChange={(event) => update({ maxPrice: event.target.value.replace(/\D/g, '') })} placeholder="No limit" className="min-h-10 min-w-0 w-full rounded-xl border border-charcoal/15 bg-cream px-3 text-sm font-normal normal-case tracking-normal outline-none focus:border-terracotta focus:ring-2 focus:ring-terracotta/15" disabled={Boolean(requestedType === 'chefs')} /></label>
                </div>
                <label className="flex items-center gap-2 text-sm text-charcoal-70 sm:col-span-2 lg:items-start"><input value={excludeAllergen} onChange={(event) => update({ excludeAllergen: event.target.value })} placeholder="Exclude allergen, e.g. nuts" className="min-h-10 min-w-0 flex-1 rounded-xl border border-charcoal/15 bg-cream px-3 outline-none focus:border-terracotta focus:ring-2 focus:ring-terracotta/15" disabled={Boolean(requestedType && requestedType !== 'dishes')} /></label>
                <div className="flex gap-2 sm:col-span-2"><Button type="submit" className="min-h-10 flex-1"><SearchX size={16} aria-hidden="true" /> Search</Button><Button type="button" variant="secondary" className="min-h-10" onClick={() => { setSearch(''); update({ q: '', city: '', category: '', status: '', cuisine: '', dietaryTag: '', occasion: '', excludeAllergen: '', minPrice: '', maxPrice: '', minRating: '', availableDay: '', chefId: '', planType: '', frequency: '' }) }}>Clear</Button></div>
              </form>
            </div>
          </div>

          <div className="min-w-0" aria-live="polite">
          {loading && <div className="grid gap-14">{visibleModes.map((mode) => <section key={mode.value}><Skeleton className="h-10 w-48" /><div className="mt-5"><LoadingCards /></div></section>)}</div>}
          {!loading && error && <div className="rounded-[1.5rem] border border-rust/30 bg-rust/10 p-6"><h2 className="font-display text-3xl">Results are not available</h2><p className="mt-2 max-w-lg text-sm leading-6 text-charcoal-70">We could not load the catalog. Try again in a moment.</p><Button className="mt-5" onClick={() => setReloadKey((key) => key + 1)}>Try again</Button></div>}
          {!loading && !error && !hasResults && <EmptyState icon={SearchX} title="No results found" description="Try a different city, cuisine, availability, or search term." action={<Button variant="secondary" onClick={() => { setSearch(''); update({ q: '', city: '', category: '', status: '', cuisine: '', dietaryTag: '', occasion: '', excludeAllergen: '', minPrice: '', maxPrice: '', minRating: '', availableDay: '', chefId: '', planType: '', frequency: '' }) }}>Clear filters</Button>} />}
          {!loading && !error && catalog && hasResults && <div className="grid gap-16">
            {visibleModes.map((mode) => {
              const result = catalog[mode.value === 'meal-plans' ? 'plans' : mode.value]
              if (!result?.data.length) return null
              return <section key={mode.value} id={mode.value} className="scroll-mt-24">
                <div className="flex flex-wrap items-end justify-between gap-4 border-b border-charcoal/10 pb-5">
                  <div><h2 className="font-display text-4xl leading-none tracking-[-0.025em]">{mode.heading}</h2><p className="mt-3 max-w-xl text-sm leading-6 text-charcoal-70">{mode.description}</p></div>
                  <p className="text-sm text-charcoal-70">{result.pageInfo.total} {mode.label.toLowerCase()}</p>
                </div>
                <div className="mt-6 grid max-w-[1080px] gap-5 md:grid-cols-2 lg:grid-cols-3">{renderModeCards(mode.value, result)}</div>
              </section>
            })}
            {(hasNext || currentPage > 1) && <Pagination page={currentPage} hasNext={hasNext} onPrevious={() => update({ page: String(Math.max(1, page - 1)) })} onNext={() => update({ page: String(page + 1) })} />}
            <p className="text-sm text-charcoal-70">{totalResults} results across the catalog</p>
          </div>}
        </div>
        </div>
      </PageContainer>
    </PublicShell>
  )
}