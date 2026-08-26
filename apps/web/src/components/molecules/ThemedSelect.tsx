import { useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'

export interface ThemedSelectOption {
  value: string
  label: string
}

interface ThemedSelectProps {
  label: string
  value: string
  options: readonly ThemedSelectOption[]
  onChange: (value: string) => void
  disabled?: boolean
}

export function ThemedSelect({ label, value, options, onChange, disabled = false }: ThemedSelectProps) {
  const generatedId = useId()
  const buttonId = `${generatedId}-button`
  const listboxId = `${generatedId}-listbox`
  const rootRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const selectedIndex = Math.max(0, options.findIndex((option) => option.value === value))
  const [activeIndex, setActiveIndex] = useState(selectedIndex)
  const selectedOption = options[selectedIndex] ?? options[0]

  useEffect(() => {
    if (!open) return
    function handlePointerDown(event: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false)
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false)
        document.getElementById(buttonId)?.focus()
      }
    }
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [buttonId, open])

  function choose(index: number) {
    const option = options[index]
    if (!option) return
    onChange(option.value)
    setActiveIndex(index)
    setOpen(false)
    document.getElementById(buttonId)?.focus()
  }

  function handleKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>) {
    if (disabled) return
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      setOpen(true)
      setActiveIndex((current) => event.key === 'ArrowDown'
        ? Math.min(options.length - 1, current + 1)
        : Math.max(0, current - 1))
      return
    }
    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault()
      setOpen(true)
      setActiveIndex(event.key === 'Home' ? 0 : options.length - 1)
      return
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      if (open) choose(activeIndex)
      else setOpen(true)
    }
  }

  return (
    <div ref={rootRef} className="relative grid gap-2 text-sm font-medium text-charcoal">
      <label htmlFor={buttonId}>{label}</label>
      <button
        id={buttonId}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        className="flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border border-charcoal/15 bg-cream px-4 text-left font-medium transition-colors hover:border-terracotta/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta disabled:cursor-not-allowed disabled:opacity-50"
        onClick={() => {
          setActiveIndex(selectedIndex)
          setOpen((current) => !current)
        }}
        onKeyDown={handleKeyDown}
      >
        <span className={value ? 'text-charcoal' : 'text-charcoal-70/70'}>{selectedOption?.label}</span>
        <span aria-hidden="true" className={`h-2.5 w-2.5 shrink-0 rotate-45 border-b-2 border-r-2 border-terracotta transition-transform ${open ? '-translate-y-0.5 rotate-[225deg]' : '-translate-y-1'}`} />
      </button>
      {open && (
        <div id={listboxId} role="listbox" aria-labelledby={buttonId} className="absolute inset-x-0 top-full z-20 mt-2 overflow-hidden rounded-xl border border-charcoal/10 bg-cream shadow-lg">
          {options.map((option, index) => {
            const selected = option.value === value
            const active = index === activeIndex
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={selected}
                className={`flex min-h-11 w-full items-center justify-between gap-3 px-4 text-left text-sm transition-colors focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-terracotta ${active ? 'bg-cream-dim' : 'hover:bg-cream-dim'}`}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => choose(index)}
              >
                <span>{option.label}</span>
                {selected && <span aria-hidden="true" className="h-2 w-2 rounded-full bg-terracotta" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
