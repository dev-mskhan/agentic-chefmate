import mongoose from 'mongoose'
import { ChatThread, IChatThread } from '../models/thread.model'
import { NotFoundError, ForbiddenError } from '@chefmate/errors'

// Read-only access to the orders collection — same MongoDB, different collection
const OrderRef =
  mongoose.models['Order'] ||
  mongoose.model(
    'Order',
    new mongoose.Schema({ customerId: String, chefId: String }, { strict: false }),
    'orders',
  )

// Read-only access to chefprofiles collection to resolve auth userId → chef profile _id
const ChefProfileRef =
  mongoose.models['ChefProfile'] ||
  mongoose.model(
    'ChefProfile',
    new mongoose.Schema({ userId: String }, { strict: false }),
    'chefprofiles',
  )

export async function resolveChefId(userId: string): Promise<string> {
  const profile = (await ChefProfileRef.findOne({ userId }).select('_id').lean()) as any
  return profile ? profile._id.toString() : userId
}

export interface ChatPrincipal {
  userId: string
  role:   string
}

export async function getOrCreateThread(
  orderId: string,
  principal: ChatPrincipal,
): Promise<IChatThread> {
  if (!mongoose.isValidObjectId(orderId)) {
    throw new NotFoundError('Order not found')
  }

  // Step 1: find or create the thread
  let thread: IChatThread | null = await ChatThread.findOne({ orderId })

  if (!thread) {
    // Step 2: fetch order to get participant IDs
    const order = (await OrderRef.findById(orderId).select('customerId chefId').lean()) as {
      customerId?: string
      chefId?: string
    } | null
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
  const callerChefId = principal.role === 'CHEF' ? await resolveChefId(principal.userId) : undefined
  if (!thread || !isParticipant(thread, principal.userId, callerChefId)) {
    throw new ForbiddenError('Not a participant')
  }

  return thread
}

export function isParticipant(thread: IChatThread, userId: string, callerChefId?: string): boolean {
  return (
    thread.customerId === userId ||
    thread.chefId === userId ||
    (!!callerChefId && thread.chefId === callerChefId)
  )
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
