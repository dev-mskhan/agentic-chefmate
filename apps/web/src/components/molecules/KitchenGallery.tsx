import { Camera } from 'lucide-react'
import { SectionHeading } from '../atoms/SectionHeading'

interface KitchenGalleryProps {
  images: string[]
  kitchenName: string
}

export function KitchenGallery({ images, kitchenName }: KitchenGalleryProps) {
  if (images.length < 2) return null

  return (
    <section className="space-y-5">
      <SectionHeading eyebrow="Inside the Kitchen" title="Workspace & Cookware Gallery">
        <span className="flex items-center gap-1.5 text-xs text-charcoal-70 rounded-pill bg-cream-dim px-3 py-1 border border-charcoal/10">
          <Camera className="h-3.5 w-3.5 text-terracotta" /> {images.length} Kitchen Photos
        </span>
      </SectionHeading>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 auto-rows-[140px] sm:auto-rows-[180px] md:auto-rows-[220px]">
        {images.slice(0, 5).map((url, idx) => (
          <div
            key={url}
            className={`overflow-hidden rounded-2xl sm:rounded-3xl relative bg-charcoal ${
              idx === 0 ? 'col-span-2 row-span-2' : ''
            }`}
          >
            <img
              src={url}
              alt={`${kitchenName} kitchen photo ${idx + 1}`}
              className="h-full w-full object-cover hover:scale-105 transition-transform duration-500"
            />
          </div>
        ))}
      </div>
    </section>
  )
}
