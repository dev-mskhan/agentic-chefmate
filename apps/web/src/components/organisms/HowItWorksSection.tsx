import { SectionReveal } from '../motion/SectionReveal'

const steps = [
  {
    step: '01',
    title: 'Find a chef',
    copy: 'Search by city and neighborhood to discover authentic home cooks, regional specialists, and certified kitchens.',
    tag: 'Neighborhood cooks',
  },
  {
    step: '02',
    title: 'Choose your food',
    copy: 'Pick a signature single dish or a recurring weekly meal plan with dietary customisations and delivery dates.',
    tag: 'Slow-simmered',
  },
  {
    step: '03',
    title: 'Receive & gather',
    copy: 'Your chef prepares each portion fresh on order day and delivers wholesome food straight to your dining table.',
    tag: 'Fresh from hearth',
  },
]

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="bg-cream-dim px-4 py-20 sm:px-8 lg:px-12 lg:py-28 2xl:px-16 overflow-hidden">
      <div className="mx-auto max-w-[1500px]">
        <SectionReveal>
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-terracotta">
              A little less scrolling, a lot more gathering
            </p>
            <h2 className="mt-4 font-display text-4xl sm:text-5xl lg:text-6xl leading-tight tracking-[-0.035em] text-charcoal">
              The good stuff is closer than you think.
            </h2>
          </div>
        </SectionReveal>

        <SectionReveal start="top 75%" stagger={0.15}>
          <div className="mt-14 grid gap-8 md:grid-cols-3 border-t border-charcoal/10 pt-10">
            {steps.map((item) => (
              <article
                key={item.title}
                data-reveal
                className="group relative rounded-3xl bg-cream p-7 border border-charcoal/8 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-lg hover:border-terracotta/30"
              >
                <div className="flex items-center justify-between">
                  <span className="font-display text-4xl sm:text-5xl font-bold text-terracotta/90 tabular-nums">
                    {item.step}
                  </span>
                  <span className="rounded-pill bg-terracotta-10 px-3 py-1 text-[11px] font-bold text-terracotta">
                    {item.tag}
                  </span>
                </div>

                <h3 className="mt-8 font-display text-2xl font-bold text-charcoal tracking-tight">
                  {item.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-charcoal-70">
                  {item.copy}
                </p>
              </article>
            ))}
          </div>
        </SectionReveal>
      </div>
    </section>
  )
}
