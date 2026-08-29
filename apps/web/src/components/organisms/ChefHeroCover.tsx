import { Link } from 'react-router-dom'
import {
  Award,
  Clock3,
  MapPin,
  ShieldCheck,
  Star,
  Utensils,
} from 'lucide-react'
import { SaveButton } from '../atoms/SaveButton'
import type { ChefRecord } from '../../services/api/publicCatalog'

interface ChefHeroCoverProps {
  chef: ChefRecord
  kitchenName: string
  coverImage: string
  profileImage: string
}

export function ChefHeroCover({
  chef,
  kitchenName,
  coverImage,
  profileImage,
}: ChefHeroCoverProps) {
  return (
    <>
      {/* Full-bleed cover */}
      <div className="relative w-full h-72 sm:h-96 overflow-hidden bg-charcoal">
        <img
          src={coverImage}
          alt={kitchenName}
          className="h-full w-full object-cover opacity-90"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal/80 via-charcoal/30 to-charcoal/10" />

        {/* Top bar */}
        <div className="absolute top-5 left-0 right-0 px-6 sm:px-10 max-w-6xl mx-auto flex items-center justify-between">
          <Link
            to="/discover?type=chefs"
            className="text-xs font-semibold text-cream/90 hover:text-cream flex items-center gap-1 backdrop-blur-sm bg-charcoal/30 rounded-pill px-3 py-1.5"
          >
            ← All kitchens
          </Link>
          <SaveButton kind="chef" id={chef.id} variant="light" />
        </div>

        {/* Kitchen name on cover */}
        <div className="absolute bottom-6 left-0 right-0 px-6 sm:px-10 max-w-6xl mx-auto">
          <span className="text-xs font-semibold uppercase tracking-widest text-saffron flex items-center gap-1.5 mb-2">
            <Utensils className="h-3.5 w-3.5" /> Home Kitchen
          </span>
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl text-cream leading-[1.05] tracking-tight">
            {kitchenName}
          </h1>
        </div>
      </div>

      {/* Profile identity strip */}
      <div className="-mt-10 relative z-10 flex flex-wrap items-end gap-5 px-6 sm:px-10 max-w-6xl mx-auto">
        <img
          src={profileImage}
          alt={chef.displayName}
          className="h-28 w-28 sm:h-32 sm:w-32 rounded-[1.75rem] border-[3px] border-cream object-cover shadow-xl shrink-0"
        />

        <div className="flex-1 min-w-0 pb-1">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="flex items-center gap-1 rounded-pill bg-sage/15 px-2.5 py-0.5 text-[11px] font-bold text-sage">
              <ShieldCheck className="h-3 w-3" /> Verified
            </span>
            <span className="flex items-center gap-1 rounded-pill bg-saffron/15 px-2.5 py-0.5 text-[11px] font-bold text-saffron-dark">
              <Award className="h-3 w-3 text-saffron" /> Master Chef
            </span>
            {chef.cuisineSpecialties.map((spec) => (
              <span
                key={spec}
                className="rounded-pill bg-terracotta-10 px-2.5 py-0.5 text-[11px] font-semibold text-terracotta"
              >
                {spec}
              </span>
            ))}
          </div>

          <p className="font-semibold text-charcoal text-sm">By {chef.displayName}</p>
          <p className="text-xs text-charcoal-70 mt-0.5 max-w-xl leading-5">
            {chef.bio}
          </p>
        </div>

        {/* Compact stats */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-charcoal-70 shrink-0">
          <span className="flex items-center gap-1 font-semibold text-charcoal">
            <Star className="h-3.5 w-3.5 fill-saffron text-saffron" />
            {chef.averageRating.toFixed(1)}
            <span className="font-normal text-charcoal-70">
              ({chef.totalReviews})
            </span>
          </span>
          <span className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5 text-terracotta" />
            {chef.serviceArea.city} · {chef.serviceArea.areas.join(', ')}
          </span>
          <span className="flex items-center gap-1">
            <Clock3 className="h-3.5 w-3.5 text-terracotta" />
            {chef.serviceArea.radiusKm} km delivery
          </span>
        </div>
      </div>
    </>
  )
}
