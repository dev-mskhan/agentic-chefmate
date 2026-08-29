import { Star } from 'lucide-react'

interface RatingLineProps {
  rating: number
  count: number
}

export function RatingLine({ rating, count }: RatingLineProps) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm">
      <Star size={15} fill="currentColor" className="text-saffron" aria-hidden="true" />
      <strong>{rating.toFixed(1)}</strong>
      <span className="text-charcoal-70">from {count} reviews</span>
    </span>
  )
}
