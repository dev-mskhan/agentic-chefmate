import { isEventProcessed, markEventProcessed } from '@chefmate/event-contracts'
import type { OrderEvent } from '@chefmate/event-contracts'
import { CompletedOrderEligibility } from '../models/completed-order-eligibility.model'

export async function handleOrderEvent(event: OrderEvent): Promise<void> {
  const eventId = (event as OrderEvent & { eventId: string }).eventId
  if (await isEventProcessed(eventId)) return
  if (event.type !== 'order.completed') {
    await markEventProcessed(eventId)
    return
  }

  await CompletedOrderEligibility.findOneAndUpdate(
    { orderId: event.orderId },
    {
      $setOnInsert: {
        orderId:    event.orderId,
        customerId: event.userId,
        chefId:     event.chefId,
        items:      event.items ?? [],
        createdAt:  new Date(),
      },
    },
    { upsert: true, new: true },
  )
  await markEventProcessed(eventId)
}
