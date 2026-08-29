import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Check } from 'lucide-react'

export interface DropdownOption {
  value: string
  label: string
}

interface DropdownProps {
  /** Currently selected value */
  value: string
  /** Called when the user picks an option */
  onChange: (value: string) => void
  /** List of selectable options */
  options: DropdownOption[]
  /** Optional placeholder when nothing is selected */
  placeholder?: string
  /** Accessible label for screen readers */
  ariaLabel?: string
  /** Disable interaction */
  disabled?: boolean
  /** Additional classes on the trigger button */
  className?: string
}

/**
 * Warm Hearth themed custom dropdown.
 * Replaces native `<select>` with a fully styled listbox that respects
 * the cream / charcoal / terracotta palette, pill radius, and type scale.
 */
export function Dropdown({
  value,
  onChange,
  options,
  placeholder = 'Select…',
  ariaLabel,
  disabled = false,
  className = '',
}: DropdownProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const selected = options.find((o) => o.value === value)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open])

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger */}
      <button
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className={`flex w-full items-center justify-between rounded-pill border bg-cream-dim px-4 py-2.5 text-xs font-semibold outline-none transition-colors ${
          open
            ? 'border-terracotta ring-2 ring-terracotta/15'
            : 'border-charcoal/15 hover:border-charcoal/30'
        } ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'} ${className}`}
      >
        <span className={selected ? 'text-charcoal' : 'text-charcoal-70/55'}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          size={14}
          className={`shrink-0 text-charcoal-70 transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Options panel */}
      {open && (
        <ul
          role="listbox"
          className="absolute z-50 mt-1.5 max-h-56 w-full overflow-auto rounded-2xl border border-charcoal/10 bg-cream shadow-md animate-in fade-in slide-in-from-top-1 duration-150"
        >
          {options.map((opt) => {
            const isActive = opt.value === value
            return (
              <li
                key={opt.value}
                role="option"
                aria-selected={isActive}
                onClick={() => {
                  onChange(opt.value)
                  setOpen(false)
                }}
                className={`flex cursor-pointer items-center justify-between px-4 py-2.5 text-xs font-semibold transition-colors ${
                  isActive
                    ? 'bg-terracotta-10 text-terracotta'
                    : 'text-charcoal hover:bg-cream-dim'
                }`}
              >
                <span>{opt.label}</span>
                {isActive && <Check size={13} className="shrink-0 text-terracotta" />}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
