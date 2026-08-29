import { Link } from 'react-router-dom'
import { ArrowRight, ShoppingBag, Sparkles } from 'lucide-react'
import { Button } from '../atoms/Button'
import type { DishRecord } from '../../services/api/publicCatalog'

interface SignatureDishSpotlightProps {
  dish: DishRecord
  image: string
  onOrder: (dishId: string) => void
}

export function SignatureDishSpotlight({
  dish,
  image,
  onOrder,
}: SignatureDishSpotlightProps) {
  return (
    <section className="rounded-3xl bg-cream border border-charcoal/10 shadow-sm p-5 sm:p-8 md:p-10">
      <div className="grid gap-6 sm:gap-8 lg:grid-cols-2 items-center">
        {/* Dish Image */}
        <div className="overflow-hidden rounded-2xl sm:rounded-3xl aspect-[4/3] sm:aspect-[16/10] lg:aspect-[4/3] relative bg-charcoal">
          <img
            src={image}
            alt={dish.name}
            className="h-full w-full object-cover hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute top-3 left-3 sm:top-4 sm:left-4">
            <span className="inline-flex items-center gap-1.5 rounded-pill bg-charcoal/80 backdrop-blur-md text-cream px-3 py-1 text-[11px] font-bold uppercase tracking-wider border border-cream/20 shadow-sm">
              <Sparkles className="h-3 w-3 text-saffron" /> Kitchen Specialty
            </span>
          </div>
        </div>

        {/* Dish Details */}
        <div className="space-y-4 sm:space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-pill bg-terracotta-10 px-3 py-1 text-xs font-bold text-terracotta border border-terracotta/20">
              {dish.cuisine}
            </span>
            {dish.dietaryTags.map((tag) => (
              <span
                key={tag}
                className="rounded-pill bg-cream-dim px-2.5 py-0.5 text-xs font-semibold text-charcoal border border-charcoal/10"
              >
                {tag}
              </span>
            ))}
          </div>

          <div>
            <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl text-charcoal font-bold leading-tight">
              {dish.name}
            </h2>
            <p className="text-xs sm:text-sm leading-relaxed text-charcoal-70 mt-2">
              {dish.description}
            </p>
          </div>

          <div className="flex flex-wrap items-baseline gap-3 pt-2 border-t border-charcoal/10">
            <span className="font-display text-2xl sm:text-3xl font-bold tabular-nums text-terracotta">
              {dish.currency} {dish.price.toLocaleString()}
            </span>
            <span className="text-xs font-semibold text-charcoal-70">
              · {dish.portionInfo}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
            <Button
              className="py-3 px-6 text-xs gap-2 justify-center"
              onClick={() => onOrder(dish.id)}
            >
              <ShoppingBag className="h-4 w-4" /> Order Now{' '}
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Link
              to={`/dishes/${dish.id}`}
              className="inline-flex min-h-11 items-center justify-center rounded-pill border border-charcoal/20 bg-cream-dim px-5 text-xs font-semibold text-charcoal hover:border-terracotta hover:text-terracotta transition-colors"
            >
              View Full Recipe Details
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
