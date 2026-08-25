import { isEventProcessed, markEventProcessed } from '@chefmate/event-contracts'
import type { PayoutEvent } from '@chefmate/event-contracts'
import { deriveNotificationId } from '../utils/idempotency'
import { getPushQueue, getInAppQueue } from '../queues/notification.queue'

export async function handlePayoutEvent(event: PayoutEvent): Promise<void> {
  const eventId = (event as PayoutEvent & { eventId: string }).eventId
  if (await isEventProcessed(eventId)) return

  const pushQueue = getPushQueue()
  const inappQueue = getInAppQueue()

  if (event.type === 'payout.completed' || event.type === 'payout.failed') {
    const pushId = deriveNotificationId(event.type, event.payoutId, 'push')
    const inappId = deriveNotificationId(event.type, event.payoutId, 'inapp')
    const data = event.type === 'payout.completed'
      ? { payoutId: event.payoutId, amountCents: event.amountCents, currency: event.currency }
      : { payoutId: event.payoutId, reason: event.reason }

    await pushQueue.add('send-notification', {
      channel: 'push',
      template: event.type,
      userId: event.chefId,
      notificationId: pushId,
      data,
    }, { jobId: pushId })

    await inappQueue.add('send-notification', {
      channel: 'inapp',
      template: event.type,
      userId: event.chefId,
      notificationId: inappId,
      data,
    }, { jobId: inappId })
  }

  await markEventProcessed(eventId)
}
