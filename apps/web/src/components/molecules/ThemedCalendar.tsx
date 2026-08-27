import Calendar from 'react-calendar'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import 'react-calendar/dist/Calendar.css'
import '../../styles/calendar.css'

interface ThemedCalendarProps {
  value: Date
  onChange: (date: Date) => void
  minDate?: Date
  maxDate?: Date
  isDateDisabled?: (date: Date) => boolean
}

export function ThemedCalendar({
  value,
  onChange,
  minDate = new Date(),
  maxDate,
  isDateDisabled,
}: ThemedCalendarProps) {
  return (
    <div className="themed-calendar-wrapper rounded-2xl bg-cream p-4 border border-charcoal/15 shadow-sm">
      <Calendar
        onChange={(val) => {
          if (val instanceof Date) {
            onChange(val)
          }
        }}
        value={value}
        minDate={minDate}
        maxDate={maxDate}
        tileDisabled={({ date, view }) => {
          if (view === 'month' && isDateDisabled) {
            return isDateDisabled(date)
          }
          return false
        }}
        prevLabel={<ChevronLeft className="h-4 w-4 text-charcoal" />}
        nextLabel={<ChevronRight className="h-4 w-4 text-charcoal" />}
        prev2Label={null}
        next2Label={null}
        formatShortWeekday={(_locale, date) =>
          ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()]
        }
      />
    </div>
  )
}
