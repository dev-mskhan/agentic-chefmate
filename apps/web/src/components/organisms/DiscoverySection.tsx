import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../atoms/Button'

type SearchMode = 'chefs' | 'dishes' | 'meal-plans'
interface DiscoveryItem { name: string; meta: string; price: string; image: string; href: string }

const discoveryData: Record<SearchMode, DiscoveryItem[]> = {
  chefs: [
    { name: 'Ayesha Khan', meta: 'Lahore · Punjabi home cooking', price: '4.9', image: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=900&q=80', href: '/chefs/ayesha-khan' },
    { name: 'Hamza Malik', meta: 'Karachi · Coastal spice kitchen', price: '4.8', image: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=900&q=80', href: '/chefs/hamza-malik' },
    { name: 'Sara Ahmed', meta: 'Islamabad · Seasonal vegetable craft', price: '4.9', image: 'https://images.unsplash.com/photo-1556761223-4c4282c73f77?auto=format&fit=crop&w=900&q=80', href: '/chefs/sara-ahmed' },
  ],
  dishes: [
    { name: 'Smoky karahi', meta: 'Ayesha Khan · Lahore', price: 'PKR 2,400', image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=900&q=80', href: '/dishes/smoky-karahi' },
    { name: 'Sea salt pulao', meta: 'Hamza Malik · Karachi', price: 'PKR 2,800', image: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=80', href: '/dishes/sea-salt-pulao' },
    { name: 'Garden daal', meta: 'Sara Ahmed · Islamabad', price: 'PKR 1,900', image: 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=900&q=80', href: '/dishes/garden-daal' },
  ],
  'meal-plans': [
    { name: 'The Sunday Dastarkhwan', meta: 'Weekly · Serves 2–4', price: 'PKR 8,400', image: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=80', href: '/plans/sunday-dastarkhwan' },
    { name: 'Seasonal Bazaar', meta: 'Biweekly · Fresh local menu', price: 'PKR 11,000', image: 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=900&q=80', href: '/plans/seasonal-bazaar' },
    { name: 'The Family Hearth', meta: 'Monthly · Serves 4–6', price: 'PKR 16,800', image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=900&q=80', href: '/plans/family-hearth' },
  ],
}

export function DiscoverySection() {
  const [mode, setMode] = useState<SearchMode>('chefs')
  const [query, setQuery] = useState('')
  const [submittedQuery, setSubmittedQuery] = useState('')
  const results = useMemo(() => {
    const normalized = submittedQuery.trim().toLowerCase()
    return normalized ? discoveryData[mode].filter((item) => `${item.name} ${item.meta}`.toLowerCase().includes(normalized)) : discoveryData[mode]
  }, [mode, submittedQuery])

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmittedQuery(query)
  }

  return (
    <section id="discover" className="relative z-10 mx-auto -mt-2 max-w-[1500px] scroll-mt-24 px-4 pb-20 sm:px-8 lg:px-12 lg:pb-24 2xl:px-16">
      <div className="discovery-panel rounded-[2rem] bg-espresso p-5 text-cream shadow-lg sm:p-8 lg:p-12">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-saffron">Across Pakistan, from your table</p><h2 className="mt-3 max-w-2xl font-display text-4xl leading-tight tracking-[-0.03em] sm:text-5xl">Find the right flavor of close to home.</h2></div>
          <p className="max-w-xs text-sm leading-6 text-cream/65">Search by place, dish, or the rhythm you want for your week.</p>
        </div>
        <div className="mt-8 flex flex-wrap gap-2" role="tablist" aria-label="Discovery type">
          {([['chefs', 'Chefs by location'], ['dishes', 'Dishes'], ['meal-plans', 'Meal plans']] as const).map(([value, label]) => <button key={value} type="button" role="tab" aria-selected={mode === value} onClick={() => { setMode(value); setSubmittedQuery('') }} className={`rounded-pill px-4 py-2 text-sm font-semibold transition-colors ${mode === value ? 'bg-saffron text-charcoal' : 'bg-cream/10 text-cream/70 hover:bg-cream/20 hover:text-cream'}`}>{label}</button>)}
        </div>
        <form className="mt-4 flex flex-col gap-3 sm:flex-row" onSubmit={handleSearch}>
          <label className="sr-only" htmlFor="discovery-search">Search {mode === 'chefs' ? 'chefs by city or neighborhood' : mode === 'dishes' ? 'dishes' : 'meal plans'}</label>
          <div className="flex min-h-14 flex-1 items-center gap-3 rounded-2xl bg-cream px-4 text-charcoal"><svg aria-hidden="true" className="h-5 w-5 shrink-0 text-terracotta" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></svg><input id="discovery-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={mode === 'chefs' ? 'Try “Lahore” or “Karachi”' : mode === 'dishes' ? 'Try “karahi” or “daal”' : 'Try “weekly” or “family”'} className="w-full bg-transparent text-base outline-none placeholder:text-charcoal-70/60" /></div>
          <Button type="submit" className="min-h-14 px-7">Search</Button>
        </form>
        <div className="mt-7 grid gap-3 sm:grid-cols-3" aria-live="polite">
          {results.map((item) => <Link key={item.name} to={item.href} className="dish-card group block overflow-hidden rounded-2xl bg-cream text-charcoal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-saffron"><div className="aspect-[16/10] overflow-hidden"><img className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" src={item.image} alt={item.name} loading="lazy" /></div><div className="p-4"><div className="flex items-start justify-between gap-3"><h3 className="font-semibold">{item.name}</h3><span className="shrink-0 text-sm font-semibold text-terracotta">{item.price}</span></div><p className="mt-1 text-sm text-charcoal-70">{item.meta}</p></div></Link>)}
          {results.length === 0 && <p className="rounded-2xl bg-cream/10 p-5 text-sm text-cream/75 sm:col-span-3">No matches yet. Try a nearby city, a broader dish, or a different plan.</p>}
        </div>
      </div>
    </section>
  )
}
