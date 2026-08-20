import { z } from 'zod'
import { ValidationError } from '@chefmate/errors'

export const DateRangeInputSchema = z.object({
  period: z.enum(['today', '7d', '30d', '90d', 'thisMonth', 'lastMonth', 'custom']),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
})

export type DateRangeInput = z.infer<typeof DateRangeInputSchema>

export interface ResolvedDateRange {
  from: Date
  to: Date
}

export function resolveDateRange(input: DateRangeInput): ResolvedDateRange {
  const now = new Date()
  switch (input.period) {
    case 'today': {
      const from = new Date(now)
      from.setUTCHours(0, 0, 0, 0)
      return { from, to: now }
    }
    case '7d':
      return { from: new Date(now.getTime() - 7 * 86400000), to: now }
    case '30d':
      return { from: new Date(now.getTime() - 30 * 86400000), to: now }
    case '90d':
      return { from: new Date(now.getTime() - 90 * 86400000), to: now }
    case 'thisMonth':
      return { from: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)), to: now }
    case 'lastMonth': {
      const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1))
      const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0, 23, 59, 59, 999))
      return { from, to }
    }
    case 'custom': {
      if (!input.from || !input.to) {
        throw new ValidationError('custom period requires both from and to')
      }
      const from = new Date(input.from)
      const to = new Date(input.to)
      if ((to.getTime() - from.getTime()) / 86400000 > 366) {
        throw new ValidationError('custom date range cannot exceed 366 days')
      }
      return { from, to }
    }
  }
}
