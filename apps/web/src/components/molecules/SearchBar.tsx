import type { FormEvent } from 'react'
import { Icon } from '../atoms/Icon'

export function SearchBar({ value, onChange, onSubmit, placeholder = 'Search' }: { value: string; onChange: (value: string) => void; onSubmit: () => void; placeholder?: string }) {
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); onSubmit() }
  return <form className="flex min-h-12 items-center gap-3 rounded-xl bg-cream px-4" onSubmit={submit}><Icon className="shrink-0 text-terracotta"><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></Icon><input className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-charcoal-70/60" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} aria-label={placeholder} /></form>
}
