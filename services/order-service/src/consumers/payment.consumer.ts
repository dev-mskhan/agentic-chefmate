import type { PaymentEvent } from '@chefmate/event-contracts'
import { Order, isValidTransition } from '../models/order.model'
import { publishOrderEvent } from '../services/event.service'
import { createLogger } from '@chefmate/logger'

const logger = createLogger('payment-consumer')

export async function handlePaymentEvent(event: PaymentEvent): Promise<void> {
  switch (event.type) {
    case 'payment.succeeded': {
      const order = await Order.findOne({ _id: event.orderId })
      if (!order) { logger.warn({ orderId: event.orderId }, 'Order not found for payment.succeeded'); return }
      if (!isValidTransition(order.status, 'CONFIRMED')) {
        logger.info({ orderId: event.orderId, status: order.status }, 'Order cannot transition to CONFIRMED — already processed')
        return
      }
      const oldStatus = order.status
      order.status = 'CONFIRMED'
      await order.save()

      await publishOrderEvent({
        type: 'order.status_changed',
        orderId:   event.orderId,
        userId:    event.customerId,
        oldStatus,
        newStatus: 'CONFIRMED',
        createdAt: new Date().toISOString(),
        version:   '1',
      })
      logger.info({ orderId: event.orderId }, 'Order confirmed after payment.succeeded')
      break
    }

    case 'payment.failed': {
      // Order remains PENDING — customer can retry checkout or cancel
      logger.warn({ orderId: event.orderId, reason: event.reason }, 'Payment failed — order remains PENDING')
      break
    }

    default:
      break
  }
}
