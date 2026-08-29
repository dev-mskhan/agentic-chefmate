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
    <section className="grid gap-8 lg:grid-cols-[1fr_1fr] items-center">
      <div className="overflow-hidden rounded-3xl aspect-[4/3]">
        <img
          src={image}
          alt={dish.name}
          className="h-full w-full object-cover hover:scale-[1.03] transition-transform duration-500"
        />
      </div>

      <div className="space-y-4">
        <span className="inline-flex items-center gap-1.5 rounded-pill bg-terracotta text-cream px-3.5 py-1 text-[11px] font-bold uppercase tracking-wider">
          <Sparkles className="h-3.5 w-3.5" /> Kitchen Specialty
        </span>

        <h2 className="font-display text-3xl sm:text-4xl text-charcoal leading-tight">
          {dish.name}
        </h2>

        <p className="text-sm leading-relaxed text-charcoal-70 max-w-lg">
          {dish.description}
        </p>

        <div className="flex items-baseline gap-3">
          <span className="font-display text-3xl font-bold tabular-nums text-terracotta">
            {dish.currency} {dish.price.toLocaleString()}
          </span>
          <span className="text-xs text-charcoal-70">{dish.portionInfo}</span>
        </div>

        <div className="flex items-center gap-3 pt-1">
          <Button
            className="py-3 px-6 text-xs gap-2"
            onClick={() => onOrder(dish.id)}
          >
            <ShoppingBag className="h-4 w-4" /> Order Now{' '}
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Link
            to={`/dishes/${dish.id}`}
            className="inline-flex min-h-11 items-center rounded-pill border border-charcoal/15 px-5 text-xs font-semibold hover:border-terracotta hover:text-terracotta transition-colors"
          >
            View Details
          </Link>
        </div>
      </div>
    </section>
  )
}
