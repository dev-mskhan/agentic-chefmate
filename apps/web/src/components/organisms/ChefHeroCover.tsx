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
  const serviceAreasText = chef.serviceArea.areas && chef.serviceArea.areas.length > 0
    ? chef.serviceArea.areas.slice(0, 3).join(', ')
    : chef.serviceArea.city

  return (
    <div className="w-full">
      {/* Full-bleed cover container */}
      <div className="relative w-full h-64 sm:h-80 md:h-96 overflow-hidden bg-charcoal">
        <img
          src={coverImage}
          alt={kitchenName}
          className="h-full w-full object-cover opacity-90"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal/90 via-charcoal/40 to-charcoal/20" />

        {/* Top navigation actions */}
        <div className="absolute top-4 sm:top-6 inset-x-0 px-4 sm:px-8 max-w-6xl mx-auto flex items-center justify-between z-20">
          <Link
            to="/discover?type=chefs"
            className="text-xs font-bold text-cream bg-charcoal/60 hover:bg-charcoal/80 backdrop-blur-md rounded-pill px-3.5 py-2 transition-all border border-cream/15 flex items-center gap-1.5 shadow-sm"
          >
            ← All Kitchens
          </Link>
          <div className="backdrop-blur-md bg-charcoal/40 rounded-full p-1 border border-cream/15">
            <SaveButton kind="chef" id={chef.id} variant="light" />
          </div>
        </div>

        {/* Kitchen title overlay on cover */}
        <div className="absolute bottom-6 sm:bottom-10 inset-x-0 px-4 sm:px-8 max-w-6xl mx-auto z-10">
          <span className="inline-flex items-center gap-1.5 rounded-pill bg-saffron/20 backdrop-blur-md border border-saffron/30 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-saffron mb-2.5">
            <Utensils className="h-3 w-3" /> Home Kitchen
          </span>
          <h1 className="font-display text-2xl sm:text-4xl md:text-5xl lg:text-6xl text-cream font-bold leading-tight tracking-tight drop-shadow-sm">
            {kitchenName}
          </h1>
        </div>
      </div>

      {/* Profile identity & stats card */}
      <div className="max-w-6xl mx-auto px-4 sm:px-8 -mt-6 sm:-mt-10 relative z-20">
        <div className="rounded-3xl bg-cream border border-charcoal/10 shadow-lg p-5 sm:p-7 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center gap-5 md:gap-6 justify-between">
            {/* Avatar & Chef Bio Info */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-5 flex-1 min-w-0">
              <img
                src={profileImage}
                alt={chef.displayName}
                className="h-20 w-20 sm:h-24 sm:w-24 md:h-28 md:w-28 rounded-2xl sm:rounded-3xl border-2 border-terracotta/20 object-cover shadow-md shrink-0 ring-4 ring-cream"
              />

              <div className="space-y-2 flex-1 min-w-0">
                {/* Badges strip */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="flex items-center gap-1 rounded-pill bg-sage/15 px-2.5 py-0.5 text-[11px] font-bold text-sage border border-sage/20">
                    <ShieldCheck className="h-3 w-3" /> Verified Home Kitchen
                  </span>
                  <span className="flex items-center gap-1 rounded-pill bg-saffron/15 px-2.5 py-0.5 text-[11px] font-bold text-saffron-dark border border-saffron/20">
                    <Award className="h-3 w-3 text-saffron" /> Master Chef
                  </span>
                  {chef.cuisineSpecialties.map((spec) => (
                    <span
                      key={spec}
                      className="rounded-pill bg-terracotta-10 px-2.5 py-0.5 text-[11px] font-semibold text-terracotta border border-terracotta/15"
                    >
                      {spec}
                    </span>
                  ))}
                </div>

                <div>
                  <h2 className="font-display text-lg sm:text-xl font-bold text-charcoal">
                    Prepared by {chef.displayName}
                  </h2>
                  <p className="text-xs sm:text-sm text-charcoal-70 mt-1 leading-relaxed line-clamp-3 md:line-clamp-2">
                    {chef.bio}
                  </p>
                </div>
              </div>
            </div>

            {/* Structured Stats Pills */}
            <div className="flex flex-wrap md:flex-col gap-2.5 pt-3 md:pt-0 border-t md:border-t-0 md:border-l border-charcoal/10 md:pl-6 shrink-0 justify-between sm:justify-start">
              <div className="flex items-center gap-2 rounded-2xl bg-cream-dim px-3.5 py-2 border border-charcoal/10">
                <Star className="h-4 w-4 fill-saffron text-saffron shrink-0" />
                <div>
                  <span className="text-xs font-bold text-charcoal tabular-nums">
                    {chef.averageRating.toFixed(1)} / 5.0
                  </span>
                  <span className="text-[10px] text-charcoal-70 block">
                    {chef.totalReviews} verified ratings
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 rounded-2xl bg-cream-dim px-3.5 py-2 border border-charcoal/10">
                <MapPin className="h-4 w-4 text-terracotta shrink-0" />
                <div className="max-w-[180px] truncate">
                  <span className="text-xs font-bold text-charcoal block truncate">
                    {chef.serviceArea.city}
                  </span>
                  <span className="text-[10px] text-charcoal-70 block truncate" title={serviceAreasText}>
                    {serviceAreasText}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 rounded-2xl bg-cream-dim px-3.5 py-2 border border-charcoal/10">
                <Clock3 className="h-4 w-4 text-sage shrink-0" />
                <div>
                  <span className="text-xs font-bold text-charcoal block">
                    Fresh to Order
                  </span>
                  <span className="text-[10px] text-charcoal-70 block">
                    Within {chef.serviceArea.radiusKm} km radius
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
