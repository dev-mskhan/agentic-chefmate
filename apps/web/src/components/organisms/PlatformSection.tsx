import { SectionReveal } from '../motion/SectionReveal'
import { StatCounter } from '../motion/StatCounter'

export function PlatformSection() {
  return (
    <section className="mx-auto grid max-w-[1500px] gap-12 px-4 py-20 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-20 lg:px-12 lg:py-28 2xl:px-16 overflow-hidden">
      {/* Dual Photo Mosaic */}
      <SectionReveal start="top 80%">
        <div className="grid grid-cols-2 gap-4">
          <div className="overflow-hidden rounded-[2rem] shadow-lg">
            <img
              className="h-64 sm:h-80 w-full object-cover transition-transform duration-700 hover:scale-105"
              src="https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=800&q=80"
              alt="Chef preparing a fresh meal in a home kitchen"
              loading="lazy"
            />
          </div>
          <div className="overflow-hidden rounded-[2rem] shadow-lg mt-10">
            <img
              className="h-64 sm:h-80 w-full object-cover transition-transform duration-700 hover:scale-105"
              src="https://images.unsplash.com/photo-1556761223-4c4282c73f77?auto=format&fit=crop&w=800&q=80"
              alt="Friends sharing food around a dinner table"
              loading="lazy"
            />
          </div>
        </div>
      </SectionReveal>

      {/* Copy & Live Counting Statistics */}
      <div>
        <SectionReveal start="top 85%">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-terracotta">
            Food from local chefs
          </p>
          <h2 className="mt-4 max-w-xl font-display text-4xl sm:text-5xl lg:text-6xl leading-[0.98] tracking-[-0.035em] text-charcoal">
            Know who prepares your food.
          </h2>
          <p className="mt-6 max-w-lg text-base sm:text-lg leading-relaxed text-charcoal-70">
            ChefMate brings verified home chefs, transparent kitchen hygiene standards, and flexible meal subscriptions into one neighborhood marketplace.
          </p>
        </SectionReveal>

        {/* Live Counters Grid */}
        <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-charcoal/10">
          <div className="space-y-1">
            <StatCounter
              value={28}
              suffix="+"
              className="font-display text-3xl sm:text-4xl text-terracotta"
            />
            <p className="text-xs font-semibold text-charcoal-70">Certified Chefs</p>
          </div>

          <div className="space-y-1">
            <StatCounter
              value={1420}
              suffix="+"
              className="font-display text-3xl sm:text-4xl text-charcoal"
            />
            <p className="text-xs font-semibold text-charcoal-70">Meals Delivered</p>
          </div>

          <div className="space-y-1">
            <StatCounter
              value={12}
              className="font-display text-3xl sm:text-4xl text-saffron"
            />
            <p className="text-xs font-semibold text-charcoal-70">Regional Cuisines</p>
          </div>

          <div className="space-y-1">
            <StatCounter
              value={4}
              className="font-display text-3xl sm:text-4xl text-sage"
            />
            <p className="text-xs font-semibold text-charcoal-70">Active Cities</p>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-2 text-xs font-bold">
          <span className="rounded-pill bg-terracotta-10 px-4 py-2 text-terracotta-dark">
            ✓ PFA / SFA Hygiene Certified
          </span>
          <span className="rounded-pill bg-cream-dim px-4 py-2 text-charcoal-70">
            ✓ Direct Chef Chat
          </span>
          <span className="rounded-pill bg-cream-dim px-4 py-2 text-charcoal-70">
            ✓ 0% Platform markup on taste
          </span>
        </div>
      </div>
    </section>
  )
}
