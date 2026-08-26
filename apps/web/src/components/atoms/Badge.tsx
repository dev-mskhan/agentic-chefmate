import type { HTMLAttributes } from 'react'

type BadgeTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger'

const tones: Record<BadgeTone, string> = {
  neutral: 'bg-cream-dim text-charcoal-70',
  accent: 'bg-terracotta-10 text-terracotta-dark',
  success: 'bg-sage/15 text-sage',
  warning: 'bg-saffron/20 text-charcoal',
  danger: 'bg-rust/15 text-rust',
}

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone
}

export function Badge({ className = '', tone = 'neutral', ...props }: BadgeProps) {
  return <span className={`inline-flex items-center rounded-pill px-3 py-1 text-xs font-semibold ${tones[tone]} ${className}`} {...props} />
}
