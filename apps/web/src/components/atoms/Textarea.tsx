import type { TextareaHTMLAttributes } from 'react'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export function Textarea({ id, label, error, className = '', ...props }: TextareaProps) {
  return <label className="grid gap-2 text-sm font-medium text-charcoal">{label && <span>{label}</span>}<textarea id={id} className={`min-h-28 rounded-xl border border-charcoal/15 bg-cream px-3 py-2 outline-none focus:border-terracotta focus:ring-2 focus:ring-terracotta/15 disabled:opacity-60 ${className}`} aria-invalid={Boolean(error)} {...props} />{error && <span className="text-xs font-normal text-rust">{error}</span>}</label>
}
