import { useState } from 'react'
import { Heart } from 'lucide-react'
import { isSaved, toggleSaved, type SavedKind } from '../../services/saved'

interface SaveButtonProps {
  kind: SavedKind
  id: string
  /** 'light' for dark backgrounds (white border/text), 'default' for cream pages */
  variant?: 'default' | 'light'
}

export function SaveButton({ kind, id, variant = 'default' }: SaveButtonProps) {
  const [saved, setSaved] = useState(() => isSaved(kind, id))

  const label = saved ? 'Saved' : `Save ${kind === 'plan' ? 'plan' : kind}`

  const base =
    'inline-flex min-h-10 items-center gap-2 rounded-pill border px-4 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-terracotta'

  const styles = saved
    ? 'border-terracotta bg-terracotta-10 text-terracotta-dark'
    : variant === 'light'
      ? 'border-cream/40 bg-charcoal/30 text-cream backdrop-blur-sm hover:border-cream hover:bg-charcoal/50'
      : 'border-charcoal/15 text-charcoal-70 hover:border-terracotta hover:text-terracotta'

  return (
    <button
      type="button"
      onClick={() => setSaved(toggleSaved(kind, id))}
      aria-pressed={saved}
      className={`${base} ${styles}`}
    >
      <Heart size={14} fill={saved ? 'currentColor' : 'none'} aria-hidden="true" />
      {label}
    </button>
  )
}
