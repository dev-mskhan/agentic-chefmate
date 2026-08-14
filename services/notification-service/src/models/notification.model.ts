import { Schema, model, Document, Types } from 'mongoose'

export type NotificationType =
  | 'ORDER_ACCEPTED'
  | 'ORDER_READY'
  | 'ORDER_DELIVERED'
  | 'ORDER_CANCELLED'
  | 'CHEF_APPROVED'
  | 'CHEF_SUSPENDED'
  | 'CHAT_MESSAGE'
  | 'WELCOME_CHEF'

export type NotificationStatus = 'pending' | 'delivered' | 'failed'

export interface INotification extends Document {
  _id: Types.ObjectId
  userId: string
  type: NotificationType
  title: string
  message: string
  data: Record<string, unknown>
  status: NotificationStatus
  deliveredAt?: Date
  failedReason?: string
  readAt?: Date
  createdAt: Date
  expiresAt?: Date
}

const NotificationSchema = new Schema<INotification>(
  {
    userId:       { type: String, required: true, index: true },
    type:         { type: String, required: true },
    title:        { type: String, required: true },
    message:      { type: String, required: true },
    data:         { type: Schema.Types.Mixed, default: {} },
    status:       {
      type:    String,
      enum:    ['pending', 'delivered', 'failed'],
      default: 'pending',
      index:   true,
    },
    deliveredAt:  { type: Date },
    failedReason: { type: String },
    readAt:       { type: Date },
    expiresAt:    { type: Date },
  },
  { timestamps: true },
)

// TTL index — auto-delete old notifications after 30 days
NotificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })
NotificationSchema.index({ userId: 1, createdAt: -1 })
NotificationSchema.index({ userId: 1, status: 1 })

export const Notification = model<INotification>('Notification', NotificationSchema)
