import { Link } from 'react-router-dom'

export function StickyNav() {
  return (
    <header className="sticky top-0 z-20 border-b border-charcoal/10 bg-cream/90 backdrop-blur-md">
      <nav className="mx-auto flex max-w-[1500px] items-center justify-between px-4 py-4 sm:px-8 lg:px-12 2xl:px-16" aria-label="Primary">
        <Link to="/" className="font-display text-2xl tracking-tight text-charcoal">
          chefmate<span className="text-terracotta">.</span>
        </Link>
        <div className="hidden items-center gap-7 text-sm text-charcoal-70 md:flex">
          <Link to="/#discover" className="transition-colors hover:text-terracotta focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-terracotta">Discover</Link>
          <Link to="/#how-it-works" className="transition-colors hover:text-terracotta focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-terracotta">How it works</Link>
          <Link to="/#chefs" className="transition-colors hover:text-terracotta focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-terracotta">Our chefs</Link>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/signin" className="hidden min-h-11 items-center justify-center rounded-pill px-5 text-sm font-semibold text-charcoal-70 transition-colors hover:bg-cream-dim hover:text-charcoal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta sm:inline-flex">Sign in</Link>
          <Link to="/discover" className="inline-flex min-h-11 items-center justify-center rounded-pill bg-terracotta px-5 text-sm font-semibold text-cream transition-colors hover:bg-terracotta-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta">Find a chef</Link>
        </div>
      </nav>
    </header>
  )
}
