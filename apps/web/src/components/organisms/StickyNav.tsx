import { Link } from 'react-router-dom'
import { Button } from '../atoms/Button'

export function StickyNav({ navigation }: { navigation?: readonly { label: string; href: string }[] }) {
  const links = navigation ?? [
    { label: 'Discover', href: '#discover' },
    { label: 'How it works', href: '#how-it-works' },
    { label: 'Our chefs', href: '#chefs' },
  ]

  return (
    <header className="sticky top-0 z-20 border-b border-charcoal/10 bg-cream/90 backdrop-blur-md">
      <nav className="mx-auto flex max-w-[1500px] items-center justify-between px-4 py-4 sm:px-8 lg:px-12 2xl:px-16" aria-label="Primary">
        <Link to="/" className="font-display text-2xl tracking-tight text-charcoal">
          chefmate<span className="text-terracotta">.</span>
        </Link>
        <div className="hidden items-center gap-7 text-sm text-charcoal-70 md:flex">
          {links.map((link) => (
            <Link key={link.href} to={link.href} className="transition-colors hover:text-terracotta">
              {link.label}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" className="hidden sm:inline-flex">Sign in</Button>
          <Button onClick={() => document.getElementById('discover')?.scrollIntoView({ behavior: 'smooth' })}>Find a chef</Button>
        </div>
      </nav>
    </header>
  )
}
