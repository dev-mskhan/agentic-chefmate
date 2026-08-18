import mongoose, { Schema, Document } from 'mongoose'

export interface IChatThread extends Document {
  orderId:              string
  customerId:           string
  chefId:               string
  lastMessageAt?:       Date
  lastMessageId?:       string
  customerUnreadCount:  number
  chefUnreadCount:      number
  createdAt:            Date
  updatedAt:            Date
}

const threadSchema = new Schema<IChatThread>(
  {
    orderId:             { type: String, required: true },
    customerId:          { type: String, required: true },
    chefId:              { type: String, required: true },
    lastMessageAt:       { type: Date },
    lastMessageId:       { type: String },
    customerUnreadCount: { type: Number, default: 0, min: 0 },
    chefUnreadCount:     { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
)

// Unique index: one thread per order
threadSchema.index({ orderId: 1 }, { unique: true })
// Compound index: efficient getMyThreads for USER role
threadSchema.index({ customerId: 1, updatedAt: -1 })
// Compound index: efficient getMyThreads for CHEF role
threadSchema.index({ chefId: 1, updatedAt: -1 })

export const ChatThread = mongoose.model<IChatThread>('ChatThread', threadSchema, 'chat_threads')
