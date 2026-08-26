import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { SiteFooter } from '../components/organisms/SiteFooter'
import { StickyNav } from '../components/organisms/StickyNav'

export function PublicPageShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-cream text-charcoal">
      <StickyNav />
      {children}
      <SiteFooter />
    </div>
  )
}

export function BackToDiscover() {
  return <Link to="/discover" className="text-sm font-semibold text-terracotta hover:text-terracotta-dark focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-terracotta">← Back to discovery</Link>
}

export function PageHeading({ title, copy }: { title: string; copy: string }) {
  return (
    <header className="max-w-3xl">
      <h1 className="font-display text-5xl leading-[0.98] tracking-[-0.035em] sm:text-7xl">{title}</h1>
      <p className="mt-6 max-w-2xl text-lg leading-8 text-charcoal-70">{copy}</p>
    </header>
  )
}
