import type { ReactNode } from 'react'

interface SectionHeadingProps {
  eyebrow?: string
  title: string
  children?: ReactNode
}

export function SectionHeading({ eyebrow, title, children }: SectionHeadingProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-terracotta mb-1">
            {eyebrow}
          </p>
        )}
        <h2 className="font-display text-2xl tracking-[-0.025em] sm:text-3xl text-charcoal">
          {title}
        </h2>
      </div>
      {children}
    </div>
  )
}
