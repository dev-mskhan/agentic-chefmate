import { Link } from 'react-router-dom'

export function ChefStorySection() {
  return (
    <section className="bg-terracotta px-4 py-20 text-cream sm:px-8 lg:px-12 lg:py-28 2xl:px-16">
      <div className="mx-auto grid max-w-[1500px] gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:gap-20">
        <div className="relative min-h-[340px] sm:min-h-[460px]">
          <img className="absolute left-0 top-0 h-[82%] w-[72%] rounded-[2rem] object-cover shadow-lg" src="https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=1100&q=80" alt="A chef cooking in a warm home kitchen" loading="lazy" />
          <img className="absolute bottom-0 right-0 h-[52%] w-[42%] rounded-[2rem] border-[8px] border-terracotta object-cover shadow-lg" src="https://images.unsplash.com/photo-1556761223-4c4282c73f77?auto=format&fit=crop&w=700&q=80" alt="Guests sharing a meal together" loading="lazy" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cream/70">Meet the chefs</p>
          <h2 className="mt-4 max-w-[14ch] font-display text-5xl leading-[0.95] tracking-[-0.035em] sm:text-6xl">
            Every menu starts with care.
          </h2>
          <p className="mt-6 max-w-[32ch] text-lg leading-8 text-cream/80">
            Meet the chefs who prepare family recipes and fresh ideas for local customers.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3.5">
            <Link
              to="/discover?type=chefs"
              className="inline-flex rounded-pill bg-cream px-5 py-3 text-sm font-semibold text-terracotta-dark transition-colors hover:bg-saffron"
            >
              Meet the chefs
            </Link>
            <Link
              to="/chef/onboarding"
              className="inline-flex rounded-pill border-2 border-cream/30 bg-terracotta-dark/40 px-5 py-3 text-sm font-semibold text-cream transition-colors hover:bg-cream hover:text-terracotta-dark"
            >
              Cook with ChefMate →
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
