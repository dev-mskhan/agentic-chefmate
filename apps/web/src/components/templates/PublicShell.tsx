import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { StickyNav } from '../organisms/StickyNav'
import { SiteFooter } from '../organisms/SiteFooter'

export interface PublicNavItem {
  label: string
  href: string
}

export function PublicShell({
  children,
  navigation,
  showFooter = true,
}: {
  children: ReactNode
  navigation?: readonly PublicNavItem[]
  showFooter?: boolean
}) {
  return (
    <div className="min-h-screen bg-cream text-charcoal">
      <StickyNav navigation={navigation} />
      {children}
      {showFooter && <SiteFooter />}
    </div>
  )
}

export function PublicBrandLink() {
  return (
    <Link to="/" className="font-display text-2xl tracking-tight text-charcoal">
      chefmate<span className="text-terracotta">.</span>
    </Link>
  )
}
