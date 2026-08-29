import { UtensilsCrossed, ShieldCheck } from 'lucide-react'
import { SectionHeading } from '../atoms/SectionHeading'

interface KitchenStoryProps {
  kitchenName: string
  chefName: string
}

export function KitchenStory({ kitchenName, chefName }: KitchenStoryProps) {
  return (
    <section className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] items-start">
      <div className="space-y-4">
        <SectionHeading eyebrow="The Kitchen Story" title="Authentic Home Cooking with Care" />
        <p className="text-sm leading-7 text-charcoal-70 max-w-xl">
          At <strong>{kitchenName}</strong>, {chefName} prepares food in small,
          controlled batches using hand-selected local spices and authentic family
          recipes passed down across generations. Every meal is cooked to order to
          ensure unmatched freshness.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-2xl bg-cream-dim/70 p-5 space-y-2">
          <UtensilsCrossed className="h-5 w-5 text-terracotta" />
          <h4 className="font-bold text-sm text-charcoal">Small-Batch Prep</h4>
          <p className="text-xs text-charcoal-70 leading-5">
            Cooked right before your delivery window.
          </p>
        </div>
        <div className="rounded-2xl bg-cream-dim/70 p-5 space-y-2">
          <ShieldCheck className="h-5 w-5 text-sage" />
          <h4 className="font-bold text-sm text-charcoal">Hygienic Standards</h4>
          <p className="text-xs text-charcoal-70 leading-5">
            Packaged in sealed food-grade containers.
          </p>
        </div>
      </div>
    </section>
  )
}
