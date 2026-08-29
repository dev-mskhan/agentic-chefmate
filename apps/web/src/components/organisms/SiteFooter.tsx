import { Link } from 'react-router-dom'

export function SiteFooter() {
  return (
    <footer className="relative isolate overflow-hidden bg-espresso px-4 pb-8 pt-20 text-cream sm:px-8 lg:px-12 2xl:px-16">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 select-none whitespace-nowrap text-center font-display text-[clamp(7rem,4rem+16vw,22rem)] leading-[0.62] tracking-[-0.08em] text-cream/[0.045]"
      >
        chefmate
      </div>

      <div className="relative mx-auto max-w-[1500px]">
        <div className="grid gap-10 border-b border-cream/15 pb-14 sm:grid-cols-2 lg:grid-cols-5">
          {/* Col 1: Brand Wordmark */}
          <div className="space-y-4">
            <Link to="/" className="font-display text-4xl tracking-[-0.04em] text-cream block">
              chefmate<span className="text-saffron">.</span>
            </Link>
            <p className="max-w-xs text-xs sm:text-sm leading-6 text-cream/65">
              Verified local home chefs, wholesome small-batch food, and flexible meal plans delivered fresh to neighborhood dining tables.
            </p>
            <div className="pt-2 text-xs font-semibold text-saffron">
              Lahore · Karachi · Islamabad · Rawalpindi
            </div>
          </div>

          {/* Col 2: Discover */}
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-saffron">
              Discovery Catalog
            </p>
            <div className="mt-4 grid gap-2.5 text-xs sm:text-sm text-cream/70">
              <Link to="/discover?type=chefs" className="hover:text-cream transition-colors">
                Certified Home Chefs
              </Link>
              <Link to="/discover?type=dishes" className="hover:text-cream transition-colors">
                Fresh Cooked Dishes
              </Link>
              <Link to="/discover?type=meal-plans" className="hover:text-cream transition-colors">
                Recurring Meal Plans
              </Link>
              <Link to="/cart" className="hover:text-cream transition-colors">
                Shopping Basket
              </Link>
              <Link to="/orders" className="hover:text-cream transition-colors">
                Order Tracking
              </Link>
            </div>
          </div>

          {/* Col 3: For Chefs */}
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-saffron">
              For Chefs
            </p>
            <div className="mt-4 grid gap-2.5 text-xs sm:text-sm text-cream/70">
              <Link
                to="/chef/onboarding"
                className="font-bold text-saffron hover:underline flex items-center gap-1 transition-colors"
              >
                Cook on ChefMate →
              </Link>
              <Link to="/chef/onboarding" className="hover:text-cream transition-colors">
                Kitchen Certification
              </Link>
              <Link to="/chef" className="hover:text-cream transition-colors">
                Calm Kitchen Portal
              </Link>
              <Link to="/chef/orders" className="hover:text-cream transition-colors">
                Kitchen Order Queue
              </Link>
              <Link to="/chef/messages" className="hover:text-cream transition-colors">
                Customer Message Center
              </Link>
            </div>
          </div>

          {/* Col 4: Company & Support */}
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-saffron">
              Company & Help
            </p>
            <div className="mt-4 grid gap-2.5 text-xs sm:text-sm text-cream/70">
              <Link to="/about" className="hover:text-cream transition-colors">
                About Our Mission
              </Link>
              <Link to="/contact" className="hover:text-cream transition-colors">
                Contact & Support Desk
              </Link>
              <Link to="/faq" className="hover:text-cream transition-colors">
                Frequently Asked Questions
              </Link>
              <Link to="/sitemap" className="hover:text-cream transition-colors">
                HTML Sitemap
              </Link>
            </div>
          </div>

          {/* Col 5: Legal & Trust */}
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-saffron">
              Legal & Trust
            </p>
            <div className="mt-4 grid gap-2.5 text-xs sm:text-sm text-cream/70">
              <Link to="/privacy" className="hover:text-cream transition-colors">
                Privacy Policy
              </Link>
              <Link to="/terms" className="hover:text-cream transition-colors">
                Terms of Service
              </Link>
              <Link to="/cookies" className="hover:text-cream transition-colors">
                Cookie Policy
              </Link>
              <Link to="/accessibility" className="hover:text-cream transition-colors">
                Accessibility Statement
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom Legal Copyright Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-6 text-xs text-cream/50">
          <span>© 2026 ChefMate Technologies Ltd. All rights reserved.</span>
          <div className="flex items-center gap-4 text-[11px]">
            <Link to="/privacy" className="hover:text-cream transition-colors">Privacy</Link>
            <span>·</span>
            <Link to="/terms" className="hover:text-cream transition-colors">Terms</Link>
            <span>·</span>
            <Link to="/cookies" className="hover:text-cream transition-colors">Cookies</Link>
            <span>·</span>
            <Link to="/sitemap" className="hover:text-cream transition-colors">Sitemap</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
