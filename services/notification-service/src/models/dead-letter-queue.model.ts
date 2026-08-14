import { Schema, model, Document, Types } from 'mongoose'
import type { NotificationJob } from '../queues/notification.queue'

/**
 * Dead Letter Queue — durable store for notifications that exhausted all
 * BullMQ retry attempts OR were classified as permanently failed (4xx, bad data).
 *
 * Unlike `removeOnFail` in Redis (a lossy rolling ring buffer), this collection
 * is durable and queryable. Entries can be reprocessed by an admin script or
 * cron, or marked abandoned after manual investigation.
 *
 * TTL: 180 days (auto-deleted by the expiresAt index).
 */
export interface IDLQEntry extends Document {
  _id: Types.ObjectId
  notificationId: string
  userId: string
  channel: string
  template: string
  /** Full BullMQ job payload — preserved so the entry can be re-enqueued. */
  jobData: NotificationJob
  error: string
  /** True when the error is non-retriable (4xx, missing required data, etc.) */
  isPermanent: boolean
  attemptsMade: number
  failedAt: Date
  status: 'pending' | 'reprocessed' | 'abandoned'
  reprocessedAt?: Date
  /** 'auto' for cron-triggered reprocessing, 'admin:{userId}' for manual. */
  reprocessedBy?: string
  expiresAt: Date
}

const DLQSchema = new Schema<IDLQEntry>(
  {
    notificationId: { type: String, required: true, unique: true, index: true },
    userId:         { type: String, required: true, index: true },
    channel:        { type: String, required: true, index: true },
    template:       { type: String, required: true },
    jobData:        { type: Schema.Types.Mixed, required: true },
    error:          { type: String, required: true },
    isPermanent:    { type: Boolean, default: false },
    attemptsMade:   { type: Number, required: true },
    failedAt:       { type: Date, required: true, index: true },
    status: {
      type:    String,
      enum:    ['pending', 'reprocessed', 'abandoned'],
      default: 'pending',
      index:   true,
    },
    reprocessedAt:  { type: Date },
    reprocessedBy:  { type: String },
    expiresAt:      { type: Date, required: true },
  },
  { timestamps: true },
)

// TTL index — MongoDB auto-deletes entries after 180 days
DLQSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })
// Compound index for the admin dashboard / reprocessor queries
DLQSchema.index({ channel: 1, status: 1, failedAt: -1 })
DLQSchema.index({ isPermanent: 1, status: 1 })

export const DLQEntry = model<IDLQEntry>('NotificationDLQ', DLQSchema)
