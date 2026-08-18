import type { OrderEvent } from '@chefmate/event-contracts'
import { CompletedOrderEligibility } from '../models/completed-order-eligibility.model'

export async function handleOrderEvent(event: OrderEvent): Promise<void> {
  if (event.type !== 'order.completed') return

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
}
