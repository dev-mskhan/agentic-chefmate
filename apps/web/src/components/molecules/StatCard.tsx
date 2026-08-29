import type { ReactNode } from 'react'
import { StatCounter } from '../motion/StatCounter'

interface StatCardProps {
  label: string
  value: string
  detail?: string
  icon?: ReactNode
  /** If provided, animates the number with a snappy 0.5s tick-up instead of displaying statically */
  numericValue?: number
  /** Optional prefix for animated value (e.g. "PKR ") */
  prefix?: string
  /** Optional suffix for animated value (e.g. "%") */
  suffix?: string
}

export function StatCard({ label, value, detail, icon, numericValue, prefix, suffix }: StatCardProps) {
  return (
    <article className="rounded-2xl bg-cream p-5 shadow-sm border border-charcoal/6">
      <div className="flex items-start justify-between gap-4">
        <span className="text-sm text-charcoal-70">{label}</span>
        {icon}
      </div>

      {numericValue !== undefined ? (
        <StatCounter
          value={numericValue}
          prefix={prefix}
          suffix={suffix}
          mode="instant"
          duration={0.5}
          className="mt-4 block font-display text-3xl"
        />
      ) : (
        <strong className="mt-4 block font-display text-3xl tabular-nums">{value}</strong>
      )}

      {detail && <p className="mt-1 text-xs text-charcoal-70">{detail}</p>}
    </article>
  )
}
