import { getBillingQueue } from '../queues/subscription.queue'
import { periodStartKey } from './date.utils'

/**
 * Schedules a BullMQ delayed job to fire billing at the given date.
 * Uses jobId = `billing:{subscriptionId}` so re-scheduling replaces the
 * previous pending job atomically (no duplicate billing jobs).
 */
export async function scheduleNextBilling(subscriptionId: string, nextBillingDate: Date): Promise<void> {
  const queue = getBillingQueue()
  const delayMs = Math.max(0, nextBillingDate.getTime() - Date.now())
  const jobId = `sub_billing_${subscriptionId}`

  // Remove any existing pending job for this subscription before re-scheduling
  const existingJob = await queue.getJob(jobId)
  if (existingJob) {
    const state = await existingJob.getState()
    if (state === 'delayed' || state === 'waiting') {
      await existingJob.remove()
    }
  }

  await queue.add(
    'process-billing',
    { subscriptionId, periodStart: periodStartKey(nextBillingDate) },
    { jobId, delay: delayMs },
  )
}

/**
 * Removes the pending billing job for a subscription (on pause/cancel).
 */
export async function cancelBillingJob(subscriptionId: string): Promise<void> {
  const queue = getBillingQueue()
  const jobId = `sub_billing_${subscriptionId}`
  const job = await queue.getJob(jobId)
  if (job) {
    const state = await job.getState()
    if (state === 'delayed' || state === 'waiting') {
      await job.remove()
    }
  }
}
