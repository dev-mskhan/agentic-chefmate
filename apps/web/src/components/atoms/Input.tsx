import type { InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export function Input({ id, label, error, className = '', ...props }: InputProps) {
  return <label className="grid gap-2 text-sm font-medium text-charcoal">{label && <span>{label}</span>}<input id={id} className={`min-h-11 rounded-xl border border-charcoal/15 bg-cream px-3 outline-none transition-colors placeholder:text-charcoal-70/55 focus:border-terracotta focus:ring-2 focus:ring-terracotta/15 disabled:cursor-not-allowed disabled:opacity-60 ${className}`} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} {...props} />{error && <span id={`${id}-error`} className="text-xs font-normal text-rust">{error}</span>}</label>
}
