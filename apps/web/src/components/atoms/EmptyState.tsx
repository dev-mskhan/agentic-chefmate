import type { ReactNode } from 'react'

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <div className="rounded-2xl bg-cream-dim p-8 text-center"><h2 className="font-display text-2xl">{title}</h2><p className="mx-auto mt-2 max-w-[42ch] text-sm leading-6 text-charcoal-70">{description}</p>{action && <div className="mt-5">{action}</div>}</div>
}
