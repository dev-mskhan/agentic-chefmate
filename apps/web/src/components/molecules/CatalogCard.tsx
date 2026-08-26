import { Link } from 'react-router-dom'
import { Badge } from '../atoms/Badge'

export function CatalogCard({ href, image, title, description, meta, price, status = 'Available', statusTone = 'success', rating, reviewCount, tags = [], eyebrow }: {
  href: string
  image: string
  title: string
  description: string
  meta: string
  price?: string
  status?: string
  statusTone?: 'neutral' | 'accent' | 'success' | 'warning' | 'danger'
  rating?: number
  reviewCount?: number
  tags?: string[]
  eyebrow?: string
}) {
  return (
    <Link to={href} className="group flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-charcoal/10 bg-cream shadow-sm transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:border-terracotta/30 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta">
      <div className="relative aspect-[4/3] overflow-hidden bg-cream-dim">
        <img src={image} alt={title} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
        {eyebrow && <span className="absolute left-4 top-4 rounded-pill bg-cream/90 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-charcoal">{eyebrow}</span>}
      </div>
      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-display text-[1.65rem] leading-tight tracking-[-0.02em]">{title}</h3>
          {price && <span className="shrink-0 text-sm font-semibold tabular-nums text-terracotta">{price}</span>}
        </div>
        <p className="mt-3 line-clamp-2 text-sm leading-6 text-charcoal-70">{description}</p>
        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-charcoal-70">
          <span>{meta}</span>
          {rating !== undefined && <span aria-label={`${rating.toFixed(1)} rating from ${reviewCount ?? 0} reviews`} className="font-semibold text-charcoal">{rating.toFixed(1)} <span className="font-normal text-charcoal-70">({reviewCount ?? 0})</span></span>}
          <Badge tone={statusTone}>{status}</Badge>
        </div>
        {tags.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{tags.slice(0, 3).map((tag) => <Badge key={tag} tone="accent">{tag}</Badge>)}</div>}
      </div>
    </Link>
  )
}
