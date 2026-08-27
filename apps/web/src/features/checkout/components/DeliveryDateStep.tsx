import { useEffect, useState } from 'react'
import { Calendar as CalendarIcon, AlertCircle, Check } from 'lucide-react'
import { ThemedCalendar } from '../../../components/molecules/ThemedCalendar'
import { checkChefAvailability } from '../../../lib/api/checkout'

interface DeliveryDateStepProps {
  chefId: string
  selectedDate?: string
  onDateSelect: (date: string, isValid: boolean) => void
  disabled?: boolean
}

export function DeliveryDateStep({ chefId, selectedDate, onDateSelect, disabled = false }: DeliveryDateStepProps) {
  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0]
  const [dateStr, setDateStr] = useState(selectedDate || tomorrowStr)
  const [checking, setChecking] = useState(false)
  const [unavailableReason, setUnavailableReason] = useState<string | null>(null)
  const [showFullCalendar, setShowFullCalendar] = useState(true)

  const selectedDateObj = new Date(dateStr + 'T00:00:00')

  useEffect(() => {
    let active = true
    setChecking(true)
    setUnavailableReason(null)

    checkChefAvailability(chefId, dateStr).then((res) => {
      if (!active) return
      setChecking(false)
      if (!res.available) {
        setUnavailableReason(res.reason || 'Chef is unavailable on this date.')
        onDateSelect(dateStr, false)
      } else {
        setUnavailableReason(null)
        onDateSelect(dateStr, true)
      }
    }).catch(() => {
      if (!active) return
      setChecking(false)
      setUnavailableReason(null)
      onDateSelect(dateStr, true)
    })

    return () => {
      active = false
    }
  }, [chefId, dateStr])

  const handleDateChange = (newDate: Date) => {
    const formatted = newDate.toISOString().split('T')[0]
    setDateStr(formatted)
  }

  // Check if a date is a Monday (chef off day rule)
  const isDateDisabled = (d: Date) => {
    return d.getDay() === 1 || d.getDate() === 31
  }

  return (
    <div className={`rounded-2xl border border-charcoal/10 bg-cream p-6 transition-all ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-terracotta">
          <CalendarIcon className="h-5 w-5" />
          <span className="text-xs font-semibold uppercase tracking-[0.2em]">Delivery Date</span>
        </div>
        <button
          type="button"
          onClick={() => setShowFullCalendar(!showFullCalendar)}
          className="text-xs font-semibold text-terracotta hover:text-terracotta-dark underline"
        >
          {showFullCalendar ? 'Hide Calendar' : 'Open Calendar'}
        </button>
      </div>

      <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-display text-xl text-charcoal">Select your delivery date</h3>
        <span className="text-xs font-semibold text-terracotta-dark bg-terracotta-10 px-3 py-1 rounded-pill flex items-center gap-1">
          <Check className="h-3.5 w-3.5" />
          {selectedDateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
      </div>

      {/* Quick selection chips */}
      <div className="mt-4 flex flex-wrap gap-2">
        {Array.from({ length: 5 }).map((_, idx) => {
          const d = new Date(Date.now() + (idx + 1) * 86400000)
          const chipDateStr = d.toISOString().split('T')[0]
          const label = idx === 0 ? 'Tomorrow' : d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
          const isSelected = dateStr === chipDateStr
          const isOffDay = d.getDay() === 1

          return (
            <button
              key={chipDateStr}
              type="button"
              disabled={isOffDay}
              onClick={() => setDateStr(chipDateStr)}
              className={`rounded-pill px-4 py-2 text-xs font-semibold transition-all ${
                isSelected
                  ? 'bg-terracotta text-cream shadow-sm scale-105'
                  : isOffDay
                  ? 'bg-cream-dim text-charcoal/30 line-through cursor-not-allowed'
                  : 'bg-cream-dim text-charcoal-70 hover:bg-terracotta-10 hover:text-terracotta'
              }`}
            >
              {label} {isOffDay && '(Off)'}
            </button>
          )
        })}
      </div>

      {/* Full Library Calendar Component */}
      {showFullCalendar && (
        <div className="mt-4">
          <ThemedCalendar
            value={selectedDateObj}
            onChange={handleDateChange}
            minDate={new Date(Date.now() + 86400000)} // Minimum tomorrow
            isDateDisabled={isDateDisabled}
          />
        </div>
      )}

      {checking && <p className="mt-2 text-xs text-charcoal-70/60 animate-pulse">Checking chef availability...</p>}

      {unavailableReason && (
        <div role="alert" className="mt-3 flex items-start gap-2.5 rounded-xl bg-rust/10 p-3.5 text-xs text-rust font-medium">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{unavailableReason}</span>
        </div>
      )}
    </div>
  )
}
