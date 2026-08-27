import type { ReactNode } from 'react'
import { Compass } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export function EmptyState({ title, description, action, icon: Icon = Compass }: { title: string; description: string; action?: ReactNode; icon?: LucideIcon }) {
  return <div className="flex flex-col items-center rounded-[1.5rem] border border-charcoal/10 bg-cream-dim/70 px-6 py-12 text-center sm:px-10"><span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-terracotta-10 text-terracotta"><Icon size={34} strokeWidth={1.7} aria-hidden="true" /></span><h2 className="mt-6 font-display text-3xl tracking-[-0.02em]">{title}</h2><p className="mx-auto mt-2 max-w-[42ch] text-sm leading-6 text-charcoal-70">{description}</p>{action && <div className="mt-6">{action}</div>}</div>
}
