import { MapPin, ArrowRight, Star, Utensils } from 'lucide-react'
import { Link } from 'react-router-dom'

interface ChefAttributionBarProps {
  chefId: string
  displayName: string
  kitchenName?: string
  profileImageUrl?: string
  city?: string
  areas?: string[]
  rating?: number
  reviewCount?: number
}

export function ChefAttributionBar({
  chefId,
  displayName,
  kitchenName,
  profileImageUrl,
  city = 'Lahore',
  areas = [],
  rating,
  reviewCount,
}: ChefAttributionBarProps) {
  const defaultAvatar = 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=200&q=80'
  const displayKitchen = kitchenName || `${displayName}'s Home Kitchen`
  const locationText = areas.length > 0 ? `${city} · ${areas.join(', ')}` : city

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-cream-dim/80 p-4 border border-charcoal/10">
      <div className="flex items-center gap-3.5">
        <img
          src={profileImageUrl || defaultAvatar}
          alt={displayName}
          className="h-12 w-12 rounded-full object-cover border-2 border-cream shadow-sm"
        />
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-terracotta flex items-center gap-1">
              <Utensils className="h-3 w-3" /> Home Kitchen
            </span>
            {rating !== undefined && (
              <span className="flex items-center gap-1 text-xs font-semibold text-charcoal">
                <Star className="h-3.5 w-3.5 fill-saffron text-saffron" />
                {rating.toFixed(1)} {reviewCount ? `(${reviewCount})` : ''}
              </span>
            )}
          </div>
          <Link
            to={`/chefs/${chefId}`}
            className="font-display text-lg font-bold text-charcoal hover:text-terracotta transition-colors block leading-tight"
          >
            {displayKitchen}
          </Link>
          <p className="text-xs text-charcoal-70 flex items-center gap-2 mt-0.5">
            <span className="font-medium text-charcoal-70">By {displayName}</span>
            <span>·</span>
            <span className="flex items-center gap-1 truncate max-w-xs">
              <MapPin className="h-3 w-3 text-terracotta shrink-0" />
              {locationText}
            </span>
          </p>
        </div>
      </div>

      <Link
        to={`/chefs/${chefId}`}
        className="inline-flex items-center gap-1.5 rounded-pill bg-cream px-4 py-2 text-xs font-semibold text-charcoal border border-charcoal/15 hover:border-terracotta hover:text-terracotta transition-colors"
      >
        <span>Visit Kitchen Profile</span>
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  )
}
