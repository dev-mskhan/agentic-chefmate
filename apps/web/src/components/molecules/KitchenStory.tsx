import { UtensilsCrossed, ShieldCheck } from 'lucide-react'
import { SectionHeading } from '../atoms/SectionHeading'

interface KitchenStoryProps {
  kitchenName: string
  chefName: string
}

export function KitchenStory({ kitchenName, chefName }: KitchenStoryProps) {
  return (
    <section className="rounded-3xl bg-cream border border-charcoal/10 shadow-sm p-6 sm:p-8 md:p-10 space-y-6">
      <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] items-start">
        <div className="space-y-4">
          <SectionHeading eyebrow="Culinary Heritage" title="Authentic Family Recipes & Care" />
          <p className="text-xs sm:text-sm leading-relaxed text-charcoal-70">
            At <strong className="text-charcoal">{kitchenName}</strong>, {chefName} prepares traditional home-cooked meals in small, dedicated batches. Using heritage earthenware cookware, fresh stone-ground aromatics, and recipes refined over decades, each order is cooked right before dispatch to ensure genuine freshness.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="rounded-2xl bg-cream-dim p-4 sm:p-5 space-y-2 border border-charcoal/10">
            <UtensilsCrossed className="h-5 w-5 text-terracotta" />
            <h4 className="font-bold text-xs sm:text-sm text-charcoal">Small-Batch Prep</h4>
            <p className="text-[11px] sm:text-xs text-charcoal-70 leading-relaxed">
              Cooked fresh right before your designated delivery window.
            </p>
          </div>

          <div className="rounded-2xl bg-cream-dim p-4 sm:p-5 space-y-2 border border-charcoal/10">
            <ShieldCheck className="h-5 w-5 text-sage" />
            <h4 className="font-bold text-xs sm:text-sm text-charcoal">Hygiene Standard</h4>
            <p className="text-[11px] sm:text-xs text-charcoal-70 leading-relaxed">
              Clean home kitchen packaging in sealed food-grade containers.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
