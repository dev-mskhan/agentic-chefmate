import { Queue } from 'bullmq'
import { getBullMQConnection } from './redis-connection'

export interface BillingJobData {
  subscriptionId: string
  periodStart:    string   // YYYY-MM-DD
}

let billingQueue: Queue<BillingJobData> | null = null

export function getBillingQueue(): Queue<BillingJobData> {
  if (!billingQueue) {
    billingQueue = new Queue<BillingJobData>('subscription-billing', {
      connection: getBullMQConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: { count: 100 },
        removeOnFail:     { count: 500 },
      },
    })
  }
  return billingQueue
}

export async function closeBillingQueue(): Promise<void> {
  await billingQueue?.close()
}
