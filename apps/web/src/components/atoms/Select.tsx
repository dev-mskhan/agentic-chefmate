import type { SelectHTMLAttributes } from 'react'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
}

export function Select({ id, label, error, className = '', children, ...props }: SelectProps) {
  return <label className="grid gap-2 text-sm font-medium text-charcoal">{label && <span>{label}</span>}<select id={id} className={`min-h-11 rounded-xl border border-charcoal/15 bg-cream px-3 outline-none focus:border-terracotta focus:ring-2 focus:ring-terracotta/15 disabled:opacity-60 ${className}`} aria-invalid={Boolean(error)} {...props}>{children}</select>{error && <span className="text-xs font-normal text-rust">{error}</span>}</label>
}
