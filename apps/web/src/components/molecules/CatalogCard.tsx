import { Link } from 'react-router-dom'
import { Badge } from '../atoms/Badge'

export function CatalogCard({ href, image, title, description, meta, price, status = 'Available' }: {
  href: string
  image: string
  title: string
  description: string
  meta: string
  price?: string
  status?: string
}) {
  return (
    <Link to={href} className="group overflow-hidden rounded-2xl bg-cream shadow-sm transition-transform duration-300 hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta">
      <div className="aspect-[4/3] overflow-hidden bg-cream-dim">
        <img src={image} alt={title} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
      </div>
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-display text-2xl leading-tight">{title}</h3>
          {price && <span className="shrink-0 text-sm font-semibold text-terracotta">{price}</span>}
        </div>
        <p className="mt-2 text-sm leading-6 text-charcoal-70">{description}</p>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-charcoal-70">
          <span>{meta}</span>
          <Badge tone={status === 'Available' ? 'success' : 'neutral'}>{status}</Badge>
        </div>
      </div>
    </Link>
  )
}
