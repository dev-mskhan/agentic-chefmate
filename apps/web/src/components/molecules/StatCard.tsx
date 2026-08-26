import type { ReactNode } from 'react'

export function StatCard({ label, value, detail, icon }: { label: string; value: string; detail?: string; icon?: ReactNode }) {
  return <article className="rounded-2xl bg-cream p-5 shadow-sm"><div className="flex items-start justify-between gap-4"><span className="text-sm text-charcoal-70">{label}</span>{icon}</div><strong className="mt-4 block font-display text-3xl tabular-number">{value}</strong>{detail && <p className="mt-1 text-xs text-charcoal-70">{detail}</p>}</article>
}
