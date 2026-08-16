import mongoose, { Schema, Document } from 'mongoose'

export interface IProcessedWebhook extends Document {
  stripeEventId: string
  processedAt:   Date
}

const processedWebhookSchema = new Schema<IProcessedWebhook>(
  {
    stripeEventId: { type: String, required: true, unique: true },
    processedAt:   { type: Date, default: () => new Date() },
  },
  { timestamps: false },
)

processedWebhookSchema.index({ stripeEventId: 1 }, { unique: true })
// TTL: auto-delete processed webhooks after 30 days
processedWebhookSchema.index({ processedAt: 1 }, { expireAfterSeconds: 2592000 })

export const ProcessedWebhook = mongoose.model<IProcessedWebhook>(
  'ProcessedWebhook',
  processedWebhookSchema,
  'processedwebhooks',
)
