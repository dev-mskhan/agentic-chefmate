import { z } from 'zod'
import mongoose from 'mongoose'

export const CursorInputSchema = z.object({
  limit:  z.number().int().min(1).max(50).default(20),
  cursor: z.string().optional(),
})
export type CursorInput = z.infer<typeof CursorInputSchema>

export function buildCursorFilter(cursor?: string): Record<string, unknown> {
  if (!cursor) return {}
  try {
    return { _id: { $lt: new mongoose.Types.ObjectId(cursor) } }
  } catch {
    return {}
  }
}

export function resolveNextCursor<T extends { _id: unknown }>(items: T[], limit: number): string | undefined {
  return items.length === limit ? (items.at(-1) as any)._id.toString() : undefined
}
