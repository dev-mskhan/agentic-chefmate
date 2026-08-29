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
  /**
   * Visual variant:
   * - `default`: Cream/charcoal Warm Hearth theme
   * - `dark`: Dark zinc admin theme
   * - `inline`: Minimal borderless trigger for embedding inside search bars
   */
  variant?: 'default' | 'dark' | 'inline'
  /** Optional icon rendered before the label */
  icon?: React.ReactNode
}

const triggerStyles = {
  default: {
    base: 'border bg-cream-dim',
    open: 'border-terracotta ring-2 ring-terracotta/15',
    closed: 'border-charcoal/15 hover:border-charcoal/30',
    text: 'text-charcoal',
    placeholder: 'text-charcoal-70/55',
    chevron: 'text-charcoal-70',
  },
  dark: {
    base: 'border bg-zinc-900 border-zinc-700',
    open: 'border-terracotta ring-2 ring-terracotta/15',
    closed: 'border-zinc-700 hover:border-zinc-500',
    text: 'text-white',
    placeholder: 'text-zinc-400',
    chevron: 'text-zinc-400',
  },
  inline: {
    base: 'border-none bg-transparent',
    open: '',
    closed: '',
    text: 'text-charcoal font-bold',
    placeholder: 'text-charcoal-70/55',
    chevron: 'text-charcoal-70',
  },
}

const panelStyles = {
  default: 'border border-charcoal/10 bg-cream shadow-2xl',
  dark: 'border border-zinc-700 bg-zinc-900 shadow-2xl',
  inline: 'border border-charcoal/15 bg-cream shadow-2xl',
}

const optionStyles = {
  default: { active: 'bg-terracotta-10 text-terracotta font-bold', idle: 'text-charcoal hover:bg-cream-dim font-medium' },
  dark: { active: 'bg-terracotta/20 text-terracotta font-bold', idle: 'text-white hover:bg-zinc-800 font-medium' },
  inline: { active: 'bg-terracotta-10 text-terracotta font-bold', idle: 'text-charcoal hover:bg-cream-dim font-medium' },
}

/**
 * Warm Hearth themed custom dropdown.
 * Replaces native `<select>` with a fully styled listbox with elevated z-index
 * and robust click-outside handling that never gets clipped or hidden.
 */
export function Dropdown({
  value,
  onChange,
  options,
  placeholder = 'Select…',
  ariaLabel,
  disabled = false,
  className = '',
  variant = 'default',
  icon,
}: DropdownProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const selected = options.find((o) => o.value === value)
  const styles = triggerStyles[variant]
  const panel = panelStyles[variant]
  const optStyles = optionStyles[variant]

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
    <div
      ref={containerRef}
      className={`relative ${open ? 'z-[90]' : 'z-20'}`}
    >
      {/* Trigger */}
      <button
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className={`flex w-full items-center justify-between gap-2 rounded-pill px-3.5 py-2 text-xs font-semibold outline-none transition-colors ${styles.base} ${
          open ? styles.open : styles.closed
        } ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'} ${className}`}
      >
        <span className="flex items-center gap-2 min-w-0">
          {icon}
          <span className={`truncate ${selected ? styles.text : styles.placeholder}`}>
            {selected ? selected.label : placeholder}
          </span>
        </span>
        <ChevronDown
          size={14}
          className={`shrink-0 ${styles.chevron} transition-transform duration-200 ${
            open ? 'rotate-180 text-terracotta' : ''
          }`}
        />
      </button>

      {/* Elevated Options panel */}
      {open && (
        <ul
          role="listbox"
          className={`absolute left-0 top-full z-[100] mt-2 max-h-60 min-w-[160px] sm:min-w-full w-max overflow-y-auto overflow-x-hidden rounded-2xl p-1.5 ${panel} animate-in fade-in zoom-in-95 duration-150`}
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
                className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3.5 py-2 text-xs transition-colors ${
                  isActive ? optStyles.active : optStyles.idle
                }`}
              >
                <span>{opt.label}</span>
                {isActive && <Check size={14} className="shrink-0 text-terracotta" />}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
