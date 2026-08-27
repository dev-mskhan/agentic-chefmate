import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '../atoms/Badge'

export function CatalogCard({ href, image, images, title, description, meta, price, status = 'Available', statusTone = 'success', rating, reviewCount, tags = [], eyebrow }: {
  href: string
  image: string
  images?: readonly string[]
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
  const sources = Array.from(new Set([image, ...(images ?? [])].filter(Boolean)))
  const [activeImage, setActiveImage] = useState(0)

  useEffect(() => {
    if (sources.length < 2) return
    const timer = window.setInterval(() => setActiveImage((index) => (index + 1) % sources.length), 4500)
    return () => window.clearInterval(timer)
  }, [sources.length])

  return (
    <Link
      to={href}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-charcoal/10 bg-cream shadow-sm transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-terracotta/30 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta"
    >
      <div className="relative aspect-[5/3] overflow-hidden bg-cream-dim">
        <img
          src={sources[activeImage] ?? image}
          alt={title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
        {/* subtle bottom gradient so any chip text stays legible over busy photos */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-charcoal/25 to-transparent" />

        {eyebrow && (
          <span className="absolute left-3 top-3 rounded-pill bg-cream/90 px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-charcoal backdrop-blur-sm">
            {eyebrow}
          </span>
        )}

        {rating !== undefined && (
          <span
            aria-label={`${rating.toFixed(1)} rating from ${reviewCount ?? 0} reviews`}
            className="absolute right-3 top-3 flex items-center gap-1 rounded-pill bg-charcoal/80 px-2.5 py-1 text-xs font-semibold text-cream backdrop-blur-sm"
          >
            <svg width="11" height="11" viewBox="0 0 20 20" fill="currentColor" className="text-terracotta-light">
              <path d="M10 1.5l2.6 5.6 6.1.7-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6-4.5-4.2 6.1-.7z" />
            </svg>
            {rating.toFixed(1)}
            <span className="font-normal text-cream/70">({reviewCount ?? 0})</span>
          </span>
        )}
        {sources.length > 1 && (
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5" aria-label={`${title} images`}>
            {sources.map((source, index) => (
              <button
                key={`${source}-${index}`}
                type="button"
                aria-label={`Show image ${index + 1} of ${sources.length}`}
                aria-pressed={activeImage === index}
                onClick={(event) => { event.preventDefault(); event.stopPropagation(); setActiveImage(index) }}
                className={`h-2 w-2 rounded-full border border-cream/80 transition-colors focus-visible:outline-2 focus-visible:outline-terracotta ${activeImage === index ? 'bg-cream' : 'bg-cream/45'}`}
              />
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="relative font-display text-[1.45rem] leading-tight tracking-[-0.02em]">
            {title}
          </h3>
          {price && <span className="shrink-0 text-sm font-semibold tabular-nums text-terracotta">{price}</span>}
        </div>

        <div className="mt-1.5 flex items-center gap-2">
          <Badge tone={statusTone}>{status}</Badge>
        </div>

        <p className="mt-3 line-clamp-2 text-sm leading-6 text-charcoal-70">{description}</p>

        <div className="mt-4 border-t border-charcoal/8 pt-3">
          <div className="flex items-center gap-1.5 text-xs text-charcoal-70">
            <svg width="12" height="12" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="shrink-0">
              <path d="M10 18s6-5.2 6-10.4A6 6 0 0 0 4 7.6C4 12.8 10 18 10 18z" />
              <circle cx="10" cy="7.6" r="2.2" />
            </svg>
            <span>{meta}</span>
          </div>

          {tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="rounded-pill border border-terracotta/30 px-2.5 py-0.5 text-[0.7rem] font-medium text-terracotta"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}