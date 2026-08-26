const steps = [
  ['Find your person', 'Search by neighborhood, craving, or the kind of table you want to set.'],
  ['Choose your moment', 'Pick a dish or a recurring plan, then make the details yours.'],
  ['Gather well', 'Your chef prepares it with care and brings a little warmth to your door.'],
]

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="bg-cream-dim px-4 py-20 sm:px-8 lg:px-12 lg:py-28 2xl:px-16">
      <div className="mx-auto max-w-[1500px]"><div className="max-w-2xl"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-terracotta">A little less scrolling, a lot more gathering</p><h2 className="mt-4 font-display text-5xl leading-tight tracking-[-0.035em] sm:text-6xl">The good stuff is closer than you think.</h2></div><div className="mt-14 grid gap-10 border-t border-charcoal/15 pt-8 md:grid-cols-3">{steps.map(([title, copy], index) => <article key={title} className="border-b border-charcoal/15 pb-8 md:border-b-0 md:border-r md:pr-8 last:border-0"><span className="font-display text-4xl text-terracotta">{String(index + 1).padStart(2, '0')}</span><h3 className="mt-10 text-xl font-semibold">{title}</h3><p className="mt-3 max-w-xs leading-7 text-charcoal-70">{copy}</p></article>)}</div></div>
    </section>
  )
}
