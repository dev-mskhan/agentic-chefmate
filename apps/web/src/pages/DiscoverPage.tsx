import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Button } from '../components/atoms/Button'
import { EmptyState } from '../components/atoms/EmptyState'
import { Skeleton } from '../components/atoms/Skeleton'
import { Pagination } from '../components/molecules/Pagination'
import { CatalogCard } from '../components/molecules/CatalogCard'
import { PageContainer } from '../components/templates/PageContainer'
import { PublicShell } from '../components/templates/PublicShell'
import { discoverChefs, discoverDishes, discoverMealPlans, type ListResponse } from '../services/api/publicCatalog'

type Mode = 'chefs' | 'dishes' | 'meal-plans'
type Result = Record<string, unknown>

const tabs: Array<{ value: Mode; label: string }> = [
  { value: 'chefs', label: 'Chefs' },
  { value: 'dishes', label: 'Dishes' },
  { value: 'meal-plans', label: 'Meal plans' },
]

export function DiscoverPage() {
  const [params, setParams] = useSearchParams()
  const mode = (params.get('type') as Mode) || 'chefs'
  const query = params.get('q') ?? ''
  const city = params.get('city') ?? ''
  const category = params.get('category') ?? ''
  const page = Number(params.get('page') ?? '1') || 1
  const [search, setSearch] = useState(query)
  const [result, setResult] = useState<ListResponse<Result> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    const timer = window.setTimeout(() => {
      setLoading(true)
      setError('')
      const filters = { query, city: city || undefined, category: category || undefined, page, pageSize: 6 }
      const request = mode === 'chefs' ? discoverChefs(filters) : mode === 'dishes' ? discoverDishes(filters) : discoverMealPlans(filters)
      request.then((response) => {
        if (active) setResult(response as ListResponse<Result>)
      }).catch(() => {
        if (active) setError('We could not load these results. Check your connection and try again.')
      }).finally(() => {
        if (active) setLoading(false)
      })
    }, 0)
    return () => { active = false; window.clearTimeout(timer) }
  }, [mode, query, city, category, page])

  const navigation = useMemo(() => tabs.map((tab) => ({ label: tab.label, href: `/discover?type=${tab.value}` })), [])
  const update = (next: Record<string, string>) => {
    const nextParams = new URLSearchParams(params)
    Object.entries(next).forEach(([key, value]) => value ? nextParams.set(key, value) : nextParams.delete(key))
    if (!('page' in next)) nextParams.delete('page')
    setParams(nextParams)
  }

  function renderCard(item: Result) {
    if (mode === 'chefs') {
      const chef = item as { id: string; displayName: string; bio: string; serviceArea: { city: string }; averageRating: number; totalReviews: number }
      return (
        <CatalogCard
          key={chef.id}
          href={`/chefs/${chef.id}`}
          image={chef.id === 'chef-ayesha-khan' ? 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=900&q=80' : 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=900&q=80'}
          title={chef.displayName}
          description={chef.bio}
          meta={`${chef.serviceArea.city} · ${chef.averageRating.toFixed(1)} from ${chef.totalReviews} reviews`}
        />
      )
    }
    if (mode === 'dishes') {
      const dish = item as { id: string; name: string; description: string; price: number; currency: string; category: string; available: boolean }
      return (
        <CatalogCard
          key={dish.id}
          href={`/dishes/${dish.id}`}
          image={dish.id === 'dish-smoky-karahi' ? 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=80' : 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=900&q=80'}
          title={dish.name}
          description={dish.description}
          meta={dish.category.replace('_', ' ')}
          price={`${dish.currency} ${dish.price.toLocaleString()}`}
          status={dish.available ? 'Available' : 'Unavailable'}
        />
      )
    }
    const plan = item as { id: string; name: string; description: string; basePrice: number; currency: string; frequency: string | null; availabilityRules: { availableDays: string[] } }
    return (
      <CatalogCard
        key={plan.id}
        href={`/plans/${plan.id}`}
        image={plan.id === 'plan-sunday-dastarkhwan' ? 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=80' : 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=900&q=80'}
        title={plan.name}
        description={plan.description}
        meta={`${plan.frequency ?? 'One-off'} · ${plan.availabilityRules.availableDays.join(', ')}`}
        price={`${plan.currency} ${plan.basePrice.toLocaleString()}`}
      />
    )
  }

  return (
    <PublicShell navigation={navigation}>
      <PageContainer className="pb-20 pt-12 sm:pt-16">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-terracotta">Find food near you</p>
          <h1 className="mt-4 font-display text-5xl leading-[0.96] tracking-[-0.035em] sm:text-6xl">Choose a chef, dish, or meal plan.</h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-charcoal-70">Search the current menus and choose food that fits your week.</p>
        </div>
        <div className="mt-10 flex flex-wrap gap-2 border-b border-charcoal/10 pb-4">
          {tabs.map((tab) => <Link key={tab.value} to={`/discover?type=${tab.value}`} className={`rounded-pill px-4 py-2 text-sm font-semibold ${mode === tab.value ? 'bg-terracotta text-cream' : 'bg-cream-dim text-charcoal-70 hover:text-charcoal'}`}>{tab.label}</Link>)}
        </div>
        <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_180px_auto]">
          <label className="grid gap-2 text-sm font-medium">Search<input value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') update({ q: search }) }} placeholder="Search chefs and menus" className="min-h-12 rounded-xl border border-charcoal/15 bg-cream px-4 outline-none focus:border-terracotta focus:ring-2 focus:ring-terracotta/15" /></label>
          <label className="grid gap-2 text-sm font-medium">City<select value={city} onChange={(event) => update({ city: event.target.value })} className="min-h-12 rounded-xl border border-charcoal/15 bg-cream px-3 outline-none focus:border-terracotta"><option value="">All cities</option><option value="Lahore">Lahore</option><option value="Karachi">Karachi</option></select></label>
          <label className="grid gap-2 text-sm font-medium">Category<select value={category} onChange={(event) => update({ category: event.target.value })} disabled={mode !== 'dishes'} className="min-h-12 rounded-xl border border-charcoal/15 bg-cream px-3 outline-none focus:border-terracotta"><option value="">All categories</option><option value="MAIN_COURSE">Main course</option><option value="SIDE">Side</option></select></label>
          <Button className="self-end min-h-12" onClick={() => update({ q: search })}>Search</Button>
        </div>
        <div className="mt-12" aria-live="polite">
          {loading && <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{[1, 2, 3].map((item) => <div key={item} className="overflow-hidden rounded-2xl bg-cream"><Skeleton className="aspect-[4/3] rounded-none" /><div className="space-y-3 p-5"><Skeleton className="h-7 w-2/3" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-1/2" /></div></div>)}</div>}
          {!loading && error && <div className="rounded-2xl border border-rust/30 bg-rust/10 p-6"><h2 className="font-display text-2xl">Results are not available</h2><p className="mt-2 text-sm text-charcoal-70">{error}</p><Button className="mt-5" onClick={() => update({ q: query })}>Try again</Button></div>}
          {!loading && !error && result?.data.length === 0 && <EmptyState title="No results found" description="Try a different city, category, or search term." action={<Button variant="secondary" onClick={() => { setSearch(''); update({ q: '', city: '', category: '' }) }}>Clear filters</Button>} />}
          {!loading && !error && result && result.data.length > 0 && <><div className="mb-5 flex items-center justify-between gap-3"><p className="text-sm text-charcoal-70">{result.pageInfo.total} results</p><span className="text-sm text-charcoal-70">Page {result.pageInfo.page} of {result.pageInfo.totalPages}</span></div><div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{result.data.map(renderCard)}</div><div className="mt-10"><Pagination page={result.pageInfo.page} hasNext={result.pageInfo.hasNextPage} onPrevious={() => update({ page: String(Math.max(1, page - 1)) })} onNext={() => update({ page: String(page + 1) })} /></div></>}
        </div>
      </PageContainer>
    </PublicShell>
  )
}
