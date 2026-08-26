import { useMemo } from 'react'
import type { FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Button } from '../components/atoms/Button'
import { mockChefs, mockDishes, mockMealPlans } from '../services/mockRepository'
import { PublicPageShell, PageHeading } from './PublicPageShell'

type ResultMode = 'chefs' | 'dishes' | 'meal-plans'

const resultModes: Array<[ResultMode, string]> = [
  ['chefs', 'Chefs'],
  ['dishes', 'Dishes'],
  ['meal-plans', 'Meal plans'],
]

export function DiscoverPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialMode = (searchParams.get('type') as ResultMode | null) ?? 'chefs'
  const mode: ResultMode = resultModes.some(([value]) => value === initialMode) ? initialMode : 'chefs'
  const submittedQuery = searchParams.get('q') ?? searchParams.get('city') ?? ''
  const normalizedQuery = submittedQuery.trim().toLowerCase()

  const chefResults = useMemo(() => mockChefs.filter((chef) => !normalizedQuery || `${chef.displayName} ${chef.bio} ${chef.cuisineSpecialties.join(' ')} ${chef.serviceArea.city}`.toLowerCase().includes(normalizedQuery)), [normalizedQuery])
  const dishResults = useMemo(() => mockDishes.filter((dish) => !normalizedQuery || `${dish.name} ${dish.description} ${dish.cuisine}`.toLowerCase().includes(normalizedQuery)), [normalizedQuery])
  const planResults = useMemo(() => mockMealPlans.filter((plan) => !normalizedQuery || `${plan.name} ${plan.description} ${plan.frequency}`.toLowerCase().includes(normalizedQuery)), [normalizedQuery])
  const resultCount = mode === 'chefs' ? chefResults.length : mode === 'dishes' ? dishResults.length : planResults.length

  function updateMode(nextMode: ResultMode) {
    setSearchParams({ type: nextMode })
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const input = event.currentTarget.elements.namedItem('discover-search')
    const nextQuery = input instanceof HTMLInputElement ? input.value.trim() : ''
    setSearchParams({ type: mode, ...(nextQuery ? { q: nextQuery } : {}) })
  }

  return (
    <PublicPageShell>
      <main className="mx-auto max-w-[1500px] px-4 py-14 sm:px-8 lg:px-12 lg:py-24 2xl:px-16">
        <PageHeading title="Find your flavor of close to home." copy="Browse verified local chefs, dishes, and meal plans. Every result is shaped like the catalog we will connect to next." />
        <div className="mt-12 rounded-[2rem] bg-espresso p-5 text-cream shadow-lg sm:p-8 lg:p-10">
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Discovery type">
            {resultModes.map(([value, label]) => (
              <button key={value} type="button" role="tab" aria-selected={mode === value} onClick={() => updateMode(value)} className={`rounded-pill px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-saffron ${mode === value ? 'bg-saffron text-charcoal' : 'bg-cream/10 text-cream/70 hover:bg-cream/20 hover:text-cream'}`}>
                {label}
              </button>
            ))}
          </div>
          <form className="mt-5 flex flex-col gap-3 sm:flex-row" onSubmit={submitSearch}>
            <label className="sr-only" htmlFor="discover-search">Search {mode}</label>
            <input id="discover-search" defaultValue={submittedQuery} placeholder={mode === 'chefs' ? 'Search city, cuisine, or chef' : mode === 'dishes' ? 'Search a dish or cuisine' : 'Search a plan or frequency'} className="min-h-14 flex-1 rounded-2xl bg-cream px-4 text-charcoal outline-none placeholder:text-charcoal-70/60 focus:ring-2 focus:ring-saffron" />
            <Button type="submit" className="min-h-14 px-7">Search</Button>
          </form>
          <p className="mt-4 text-sm text-cream/60" aria-live="polite">{resultCount} {mode === 'meal-plans' ? 'plans' : mode} · ranked by textScore, rating, review count{mode === 'chefs' ? ', and distance when available' : ''}</p>
        </div>
        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {mode === 'chefs' && chefResults.map((chef) => (
            <Link key={chef.id} to={`/chefs/${chef.id.replace(/^chef-/, '')}`} className="group overflow-hidden rounded-2xl bg-cream-dim focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-terracotta">
              <img className="aspect-[16/10] w-full object-cover transition-transform duration-500 group-hover:scale-105" src={chef.profileImageUrl} alt={chef.displayName} loading="lazy" />
              <div className="p-5"><div className="flex items-start justify-between gap-3"><h2 className="font-display text-2xl">{chef.displayName}</h2><span className="text-sm font-semibold text-terracotta">★ {chef.averageRating}</span></div><p className="mt-2 text-sm text-charcoal-70">{chef.serviceArea.city} · {chef.cuisineSpecialties.join(' · ')}</p><p className="mt-3 text-sm leading-6 text-charcoal-70">{chef.bio}</p><p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-charcoal-70">{chef.totalReviews} reviews · textScore 0.92</p></div>
            </Link>
          ))}
          {mode === 'dishes' && dishResults.map((dish) => (
            <Link key={dish.id} to={`/dishes/${dish.id.replace(/^dish-/, '')}`} className="group overflow-hidden rounded-2xl bg-cream-dim focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-terracotta">
              <img className="aspect-[16/10] w-full object-cover transition-transform duration-500 group-hover:scale-105" src={dish.media[0].url} alt={dish.name} loading="lazy" />
              <div className="p-5"><div className="flex items-start justify-between gap-3"><h2 className="font-display text-2xl">{dish.name}</h2><span className="text-sm font-semibold text-terracotta">PKR {dish.price.toLocaleString()}</span></div><p className="mt-2 text-sm text-charcoal-70">{dish.cuisine} · {dish.category}</p><p className="mt-3 text-sm leading-6 text-charcoal-70">{dish.description}</p><p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-charcoal-70">★ {dish.averageRating} · {dish.totalReviews} reviews · textScore 0.89</p></div>
            </Link>
          ))}
          {mode === 'meal-plans' && planResults.map((plan) => (
            <Link key={plan.id} to={`/plans/${plan.id.replace(/^plan-/, '')}`} className="group overflow-hidden rounded-2xl bg-cream-dim focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-terracotta">
              <div className="aspect-[16/10] bg-terracotta p-6 text-cream"><p className="text-sm font-semibold text-saffron">{plan.frequency} · {plan.type === 'SUBSCRIPTION' ? 'Recurring' : 'One-off'}</p><h2 className="mt-12 max-w-[12ch] font-display text-3xl">{plan.name}</h2></div>
              <div className="p-5"><div className="flex items-start justify-between gap-3"><p className="text-sm text-charcoal-70">{plan.tiers[0].serves}</p><span className="text-sm font-semibold text-terracotta">PKR {plan.basePrice.toLocaleString()}</span></div><p className="mt-3 text-sm leading-6 text-charcoal-70">{plan.description}</p><p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-charcoal-70">★ {plan.averageRating} · {plan.totalReviews} reviews · textScore 0.87</p></div>
            </Link>
          ))}
          {resultCount === 0 && <div className="rounded-2xl border border-charcoal/10 bg-cream-dim p-8 md:col-span-2 lg:col-span-3"><h2 className="font-display text-3xl">Nothing matched that search.</h2><p className="mt-3 text-charcoal-70">Try a nearby city, a broader cuisine, or clear the search to see the demo catalog.</p><button type="button" onClick={() => setSearchParams({ type: mode })} className="mt-6 font-semibold text-terracotta underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-terracotta">Clear search</button></div>}
        </div>
      </main>
    </PublicPageShell>
  )
}
