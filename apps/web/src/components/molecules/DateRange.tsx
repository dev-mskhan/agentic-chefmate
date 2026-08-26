import type { ChangeEvent } from 'react'

export function DateRange({ from, to, onChange }: { from: string; to: string; onChange: (range: { from: string; to: string }) => void }) {
  const update = (key: 'from' | 'to') => (event: ChangeEvent<HTMLInputElement>) => onChange({ from, to, [key]: event.target.value })
  return <div className="flex flex-wrap items-end gap-3"><label className="grid gap-2 text-sm font-medium">From<input type="date" value={from} onChange={update('from')} className="min-h-11 rounded-xl border border-charcoal/15 bg-cream px-3 outline-none focus:border-terracotta" /></label><label className="grid gap-2 text-sm font-medium">To<input type="date" value={to} onChange={update('to')} className="min-h-11 rounded-xl border border-charcoal/15 bg-cream px-3 outline-none focus:border-terracotta" /></label></div>
}
