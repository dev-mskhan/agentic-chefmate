import mongoose, { Schema, Document } from 'mongoose'

export type SenderRole = 'USER' | 'CHEF'

export interface IMessage extends Document {
  threadId:         string
  orderId:          string
  senderId:         string
  senderRole:       SenderRole
  content:          string
  messageType:      'TEXT'
  readAt?:          Date
  clientMessageId?: string
  createdAt:        Date
  updatedAt:        Date
}

const messageSchema = new Schema<IMessage>(
  {
    threadId:         { type: String, required: true },
    orderId:          { type: String, required: true },
    senderId:         { type: String, required: true },
    senderRole:       { type: String, enum: ['USER', 'CHEF'], required: true },
    content:          { type: String, required: true, maxlength: 2000 },
    messageType:      { type: String, enum: ['TEXT'], default: 'TEXT', required: true },
    readAt:           { type: Date },
    clientMessageId:  { type: String },
  },
  { timestamps: true },
)

// Compound index: cursor-based pagination for listMessages
messageSchema.index({ threadId: 1, createdAt: 1 })
// Sparse unique index: idempotent message delivery
messageSchema.index({ clientMessageId: 1 }, { unique: true, sparse: true })

export const Message = mongoose.model<IMessage>('Message', messageSchema, 'chat_messages')
