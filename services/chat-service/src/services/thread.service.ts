import mongoose from 'mongoose'
import { ChatThread, IChatThread } from '../models/thread.model'
import { NotFoundError, ForbiddenError } from '@chefmate/errors'

// Read-only access to the orders collection — same MongoDB, different collection
// We use a minimal schema just to read customerId and chefId
const OrderRef = mongoose.model(
  'Order',
  new mongoose.Schema({ customerId: String, chefId: String }, { strict: false }),
  'orders',
)

export interface ChatPrincipal {
  userId: string
  role:   string
}

export async function getOrCreateThread(
  orderId: string,
  principal: ChatPrincipal,
): Promise<IChatThread> {
  // Step 1: find or create the thread
  let thread: IChatThread | null = await ChatThread.findOne({ orderId })

  if (!thread) {
    // Step 2: fetch order to get participant IDs
    const order = await OrderRef.findById(orderId).select('customerId chefId').lean()
    if (!order || !order.customerId || !order.chefId) {
      throw new NotFoundError('Order not found')
    }

    // Step 3: idempotent upsert
    thread = await ChatThread.findOneAndUpdate(
      { orderId },
      {
        $setOnInsert: {
          orderId,
          customerId:          order.customerId,
          chefId:              order.chefId,
          customerUnreadCount: 0,
          chefUnreadCount:     0,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    )
  }

  // Step 4: participant check
  if (!thread || (thread.customerId !== principal.userId && thread.chefId !== principal.userId)) {
    throw new ForbiddenError('Not a participant')
  }

  return thread
}

export function isParticipant(thread: IChatThread, userId: string): boolean {
  return thread.customerId === userId || thread.chefId === userId
}

export function getRecipientId(thread: IChatThread, senderId: string): string {
  return thread.customerId === senderId ? thread.chefId : thread.customerId
}

export function getUnreadCountField(role: string): 'customerUnreadCount' | 'chefUnreadCount' {
  return role === 'USER' ? 'customerUnreadCount' : 'chefUnreadCount'
}

export function getRecipientUnreadField(senderRole: string): 'customerUnreadCount' | 'chefUnreadCount' {
  return senderRole === 'USER' ? 'chefUnreadCount' : 'customerUnreadCount'
}
