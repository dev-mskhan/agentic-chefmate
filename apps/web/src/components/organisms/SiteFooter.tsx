import { Link } from 'react-router-dom'

export function SiteFooter() {
  return (
    <footer className="relative isolate overflow-hidden bg-espresso px-4 pb-8 pt-20 text-cream sm:px-8 lg:px-12 2xl:px-16">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 select-none whitespace-nowrap text-center font-display text-[clamp(7rem,4rem+16vw,22rem)] leading-[0.62] tracking-[-0.08em] text-cream/[0.055]"
      >
        chefmate
      </div>
      <div className="relative mx-auto max-w-[1500px]">
        <div className="grid gap-10 border-b border-cream/15 pb-14 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]">
          <div>
            <p className="font-display text-4xl tracking-[-0.04em]">
              chefmate<span className="text-saffron">.</span>
            </p>
            <p className="mt-4 max-w-xs text-sm leading-6 text-cream/60">
              Local home chefs and small-batch food, delivered fresh to your door.
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-saffron">
              Discover
            </p>
            <div className="mt-4 grid gap-3 text-sm text-cream/65">
              <Link to="/discover?type=chefs" className="hover:text-cream transition-colors">
                Find a chef
              </Link>
              <Link to="/discover?type=dishes" className="hover:text-cream transition-colors">
                Browse dishes
              </Link>
              <Link to="/discover?type=meal-plans" className="hover:text-cream transition-colors">
                Meal plans
              </Link>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-saffron">
              For Chefs
            </p>
            <div className="mt-4 grid gap-3 text-sm text-cream/65">
              <Link
                to="/chef/onboarding"
                className="font-bold text-saffron hover:underline flex items-center gap-1 transition-colors"
              >
                Cook on ChefMate →
              </Link>
              <Link to="/chef/onboarding" className="hover:text-cream transition-colors">
                Chef Onboarding
              </Link>
              <Link to="/chef" className="hover:text-cream transition-colors">
                Calm Kitchen Portal
              </Link>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-saffron">
              ChefMate
            </p>
            <div className="mt-4 grid gap-3 text-sm text-cream/65">
              <Link to="/discover" className="hover:text-cream transition-colors">
                How it works
              </Link>
              <Link to="/discover?type=chefs" className="hover:text-cream transition-colors">
                Meet the chefs
              </Link>
              <Link to="/cart" className="hover:text-cream transition-colors">
                Your basket
              </Link>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-saffron">
              Updates
            </p>
            <p className="mt-4 text-sm leading-6 text-cream/65">
              Get new menu updates by email.
            </p>
            <div className="mt-4 flex gap-2">
              <input
                aria-label="Email address"
                placeholder="Your email"
                className="min-w-0 flex-1 rounded-xl bg-cream/10 px-3 py-2.5 text-xs text-cream outline-none placeholder:text-cream/40 focus:ring-1 focus:ring-saffron"
              />
              <button
                type="button"
                aria-label="Join email updates"
                className="rounded-xl bg-saffron px-4 text-xs font-bold text-charcoal hover:bg-saffron/90 transition-colors shrink-0"
              >
                Join
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap justify-between gap-3 pt-6 text-xs text-cream/45">
          <span>© 2026 ChefMate</span>
          <span>Food prepared by local chefs.</span>
        </div>
      </div>
    </footer>
  )
}
