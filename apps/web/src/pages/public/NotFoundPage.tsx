import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Home, Search, Utensils } from 'lucide-react'
import { PublicShell } from '../../components/templates/PublicShell'
import { PageContainer } from '../../components/templates/PageContainer'
import { Button } from '../../components/atoms/Button'

export function NotFoundPage() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')

  const handleSearch = (e: FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return
    navigate(`/discover?q=${encodeURIComponent(query.trim())}`)
  }

  return (
    <PublicShell>
      <PageContainer className="py-20 sm:py-28 text-center">
        <div className="max-w-xl mx-auto space-y-6">
          <span className="font-display text-8xl sm:text-9xl font-bold text-terracotta/80 block select-none">
            404
          </span>

          <h1 className="font-display text-3xl sm:text-4xl font-bold text-charcoal tracking-tight">
            Page not found
          </h1>

          <p className="text-sm sm:text-base text-charcoal-70 leading-relaxed">
            The kitchen recipe, chef profile, or page you were looking for doesn't exist or has moved. Try searching for dishes or head back to the discovery catalog.
          </p>

          {/* Quick Search on 404 */}
          <form onSubmit={handleSearch} className="flex gap-2 max-w-md mx-auto pt-2">
            <div className="flex flex-1 items-center gap-2 rounded-2xl bg-cream-dim px-4 py-3 border border-charcoal/15 text-xs sm:text-sm">
              <Search size={16} className="text-terracotta shrink-0" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search karahi, biryani, or local chefs..."
                className="w-full bg-transparent text-charcoal outline-none placeholder:text-charcoal-70/60"
              />
            </div>
            <Button type="submit" className="px-5 py-3 text-xs font-bold shrink-0">
              Search
            </Button>
          </form>

          {/* Navigation Links */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-pill bg-terracotta text-cream text-xs font-bold hover:bg-terracotta-dark shadow-sm transition-colors"
            >
              <Home size={14} /> Back to Homepage
            </Link>
            <Link
              to="/discover"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-pill bg-cream-dim text-charcoal text-xs font-bold border border-charcoal/15 hover:border-terracotta transition-colors"
            >
              <Utensils size={14} /> Explore Food Catalog
            </Link>
          </div>
        </div>
      </PageContainer>
    </PublicShell>
  )
}
