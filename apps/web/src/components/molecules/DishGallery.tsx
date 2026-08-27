import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'

export function DishGallery({ images, title }: { images: readonly string[]; title: string }) {
  const sources = images.length ? images : ['https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1400&q=85']
  const [active, setActive] = useState(0)
  const current = sources[active] ?? sources[0]

  const move = (direction: -1 | 1) => {
    setActive((index) => (index + direction + sources.length) % sources.length)
  }

  return (
    <div className="grid gap-3">
      <div className="group relative aspect-[4/3] overflow-hidden rounded-[2rem] bg-cream-dim">
        <img src={current} alt={`${title}, view ${active + 1} of ${sources.length}`} className="h-full w-full object-cover" />
        {sources.length > 1 && (
          <>
            <button type="button" aria-label="Previous dish image" onClick={() => move(-1)} className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-cream/90 text-charcoal opacity-0 shadow-sm transition-opacity group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-terracotta">
              <ChevronLeft size={19} aria-hidden="true" />
            </button>
            <button type="button" aria-label="Next dish image" onClick={() => move(1)} className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-cream/90 text-charcoal opacity-0 shadow-sm transition-opacity group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-terracotta">
              <ChevronRight size={19} aria-hidden="true" />
            </button>
          </>
        )}
      </div>
      {sources.length > 1 && (
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-5" aria-label="Dish images">
          {sources.map((source, index) => (
            <button type="button" key={`${source}-${index}`} onClick={() => setActive(index)} aria-label={`Show dish image ${index + 1}`} aria-pressed={active === index} className={`aspect-[4/3] overflow-hidden rounded-xl border-2 transition-colors focus-visible:outline-2 focus-visible:outline-terracotta ${active === index ? 'border-terracotta' : 'border-transparent'}`}>
              <img src={source} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
      {sources.length > 1 && <div className="flex justify-center gap-1.5 md:hidden">{sources.map((source, index) => <button type="button" key={`${source}-dot-${index}`} onClick={() => setActive(index)} aria-label={`Show dish image ${index + 1}`} aria-pressed={active === index} className={`h-2 w-2 rounded-full transition-colors ${active === index ? 'bg-terracotta' : 'bg-charcoal/20'}`} />)}</div>}
    </div>
  )
}
