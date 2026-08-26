export function PlatformSection() {
  return (
    <section className="mx-auto grid max-w-[1500px] gap-12 px-4 py-20 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-20 lg:px-12 lg:py-28 2xl:px-16">
      <div className="grid grid-cols-2 gap-3">
        <img className="h-64 w-full rounded-[1.6rem] object-cover sm:h-80" src="https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=800&q=80" alt="Chef preparing a fresh meal in a home kitchen" loading="lazy" />
        <img className="mt-12 h-64 w-full rounded-[1.6rem] object-cover sm:h-80" src="https://images.unsplash.com/photo-1556761223-4c4282c73f77?auto=format&fit=crop&w=800&q=80" alt="Friends sharing food around a dinner table" loading="lazy" />
      </div>
      <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-terracotta">Food from local chefs</p><h2 className="mt-4 max-w-xl font-display text-5xl leading-[0.98] tracking-[-0.035em] sm:text-6xl">Know who prepares your food.</h2><p className="mt-6 max-w-lg text-lg leading-8 text-charcoal-70">ChefMate brings local chefs, clear menus, and flexible meal plans into one place.</p><div className="mt-8 flex flex-wrap gap-2 text-sm font-semibold"><span className="rounded-pill bg-terracotta-10 px-4 py-2 text-terracotta-dark">Local chefs</span><span className="rounded-pill bg-cream-dim px-4 py-2 text-charcoal-70">Flexible plans</span><span className="rounded-pill bg-cream-dim px-4 py-2 text-charcoal-70">Clear menus</span></div></div>
    </section>
  )
}
