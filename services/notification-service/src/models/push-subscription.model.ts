import { Schema, model, Document, Types } from 'mongoose'

export interface IPushSubscription extends Document {
  _id: Types.ObjectId
  userId: string
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
  createdAt: Date
}

const PushSubscriptionSchema = new Schema<IPushSubscription>(
  {
    userId:   { type: String, required: true, index: true },
    endpoint: { type: String, required: true },
    keys: {
      p256dh: { type: String, required: true },
      auth:   { type: String, required: true },
    },
  },
  { timestamps: true },
)

// Unique index on endpoint — one subscription per device
PushSubscriptionSchema.index({ endpoint: 1 }, { unique: true })

export const PushSubscription = model<IPushSubscription>('PushSubscription', PushSubscriptionSchema)
