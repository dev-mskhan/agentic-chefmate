import type { ReactNode } from 'react'

export function Topbar({ title, actions }: { title: string; actions?: ReactNode }) {
  return <header className="flex min-h-16 items-center justify-between gap-4 border-b border-charcoal/10 bg-cream px-4 sm:px-6"><h1 className="font-display text-2xl">{title}</h1>{actions}</header>
}
