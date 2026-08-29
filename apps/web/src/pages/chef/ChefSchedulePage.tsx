import { useEffect, useState } from 'react'
import {
  Calendar,
  Check,
  Clock,
  Plus,
  Save,
  Trash2,
  Zap,
} from 'lucide-react'
import { ChefShell } from '../../components/templates/ChefShell'
import { Button } from '../../components/atoms/Button'
import { Input } from '../../components/atoms/Input'
import { Skeleton } from '../../components/atoms/Skeleton'
import {
  getChefSchedule,
  updateChefSchedule,
  type ChefScheduleData,
} from '../../services/api/chefService'

const ALL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export function ChefSchedulePage() {
  const [schedule, setSchedule] = useState<ChefScheduleData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedSuccess, setSavedSuccess] = useState(false)
  const [newBlackoutDate, setNewBlackoutDate] = useState('')

  useEffect(() => {
    getChefSchedule()
      .then((data) => setSchedule(data))
      .finally(() => setLoading(false))
  }, [])

  if (loading || !schedule) {
    return (
      <ChefShell title="Schedule & Prep Capacity">
        <Skeleton className="h-96 w-full rounded-3xl" />
      </ChefShell>
    )
  }

  const toggleDay = (day: string) => {
    const nextDays = schedule.weeklyDays.includes(day)
      ? schedule.weeklyDays.filter((d) => d !== day)
      : [...schedule.weeklyDays, day]
    setSchedule({ ...schedule, weeklyDays: nextDays })
  }

  const handleAddBlackout = () => {
    if (!newBlackoutDate) return
    if (!schedule.blackoutDates.includes(newBlackoutDate)) {
      setSchedule({
        ...schedule,
        blackoutDates: [...schedule.blackoutDates, newBlackoutDate],
      })
    }
    setNewBlackoutDate('')
  }

  const handleRemoveBlackout = (date: string) => {
    setSchedule({
      ...schedule,
      blackoutDates: schedule.blackoutDates.filter((d) => d !== date),
    })
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSavedSuccess(false)

    await updateChefSchedule(schedule)
    setSaving(false)
    setSavedSuccess(true)
    setTimeout(() => setSavedSuccess(false), 3000)
  }

  return (
    <ChefShell
      title="Schedule & Prep Capacity"
      subtitle="Control your kitchen's operating days, daily capacity limits, and lead times to protect small-batch quality."
    >
      <form onSubmit={handleSave} className="space-y-8 max-w-4xl">
        {/* Weekly operating days */}
        <div className="rounded-3xl bg-cream border border-charcoal/10 shadow-sm p-6 sm:p-8 space-y-4">
          <h2 className="font-display text-xl text-charcoal flex items-center gap-2">
            <Calendar size={18} className="text-terracotta" /> Operating Weekdays
          </h2>
          <p className="text-xs text-charcoal-70">
            Select the days your home kitchen is open to receive fresh order requests.
          </p>

          <div className="flex flex-wrap gap-2 pt-2">
            {ALL_DAYS.map((day) => {
              const active = schedule.weeklyDays.includes(day)
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(day)}
                  className={`rounded-pill px-4 py-2 text-xs font-semibold border transition-all ${
                    active
                      ? 'bg-terracotta text-cream border-terracotta shadow-sm'
                      : 'bg-cream-dim text-charcoal-70 border-charcoal/10 hover:border-charcoal/30'
                  }`}
                >
                  {day}
                </button>
              )
            })}
          </div>
        </div>

        {/* Daily Capacity & Lead Time */}
        <div className="rounded-3xl bg-cream border border-charcoal/10 shadow-sm p-6 sm:p-8 space-y-6">
          <h2 className="font-display text-xl text-charcoal flex items-center gap-2">
            <Zap size={18} className="text-terracotta" /> Capacity & Lead Time Limits
          </h2>

          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-charcoal">
                Max Daily Orders Capacity
              </label>
              <Input
                type="number"
                min="1"
                max="50"
                value={schedule.dailyCapacity}
                onChange={(e) =>
                  setSchedule({ ...schedule, dailyCapacity: Number(e.target.value) || 15 })
                }
                required
              />
              <span className="text-[11px] text-charcoal-70 block">
                The platform automatically caps daily checkout volume once reached.
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-charcoal">
                Minimum Advance Notice (Hours)
              </label>
              <Input
                type="number"
                min="1"
                max="48"
                value={schedule.leadTimeHours}
                onChange={(e) =>
                  setSchedule({ ...schedule, leadTimeHours: Number(e.target.value) || 4 })
                }
                required
              />
              <span className="text-[11px] text-charcoal-70 block">
                Time required before delivery window to prep fresh ingredients.
              </span>
            </div>
          </div>
        </div>

        {/* Blackout dates manager */}
        <div className="rounded-3xl bg-cream border border-charcoal/10 shadow-sm p-6 sm:p-8 space-y-4">
          <h2 className="font-display text-xl text-charcoal flex items-center gap-2">
            <Clock size={18} className="text-terracotta" /> Kitchen Closure & Blackout Dates
          </h2>
          <p className="text-xs text-charcoal-70">
            Block specific dates for family commitments, travel, or kitchen maintenance.
          </p>

          <div className="flex gap-2 max-w-sm">
            <Input
              type="date"
              value={newBlackoutDate}
              onChange={(e) => setNewBlackoutDate(e.target.value)}
            />
            <Button
              type="button"
              variant="secondary"
              onClick={handleAddBlackout}
              className="text-xs py-2 px-4 shrink-0"
            >
              <Plus size={14} /> Add
            </Button>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            {schedule.blackoutDates.map((date) => (
              <span
                key={date}
                className="inline-flex items-center gap-2 rounded-pill bg-cream-dim border border-charcoal/15 px-3 py-1 text-xs font-semibold text-charcoal"
              >
                {date}
                <button
                  type="button"
                  onClick={() => handleRemoveBlackout(date)}
                  className="text-charcoal-70 hover:text-terracotta"
                >
                  <Trash2 size={12} />
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Save button and feedback */}
        <div className="flex items-center justify-between pt-4 border-t border-charcoal/10">
          {savedSuccess ? (
            <div className="flex items-center gap-2 text-xs font-bold text-sage">
              <Check size={14} /> Schedule updated successfully
            </div>
          ) : (
            <span />
          )}

          <Button type="submit" disabled={saving} className="text-xs py-2.5 px-6 gap-2">
            <Save size={14} /> {saving ? 'Saving...' : 'Save Operating Schedule'}
          </Button>
        </div>
      </form>
    </ChefShell>
  )
}
