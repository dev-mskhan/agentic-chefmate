import webpush from 'web-push'
import { config } from '../config'
import { createLogger } from '@chefmate/logger'

const logger = createLogger('notification-web-push')

/**
 * Initialises the VAPID details for web-push.
 * Safe to call even if VAPID keys are absent — it simply skips setup.
 */
export function initWebPush(): void {
  if (!config.VAPID_PUBLIC_KEY || !config.VAPID_PRIVATE_KEY) {
    logger.warn('VAPID keys not configured — Web Push notifications disabled')
    return
  }
  webpush.setVapidDetails(
    `mailto:${config.VAPID_SUBJECT}`,
    config.VAPID_PUBLIC_KEY,
    config.VAPID_PRIVATE_KEY,
  )
  logger.info('Web Push (VAPID) initialised')
}

/**
 * Sends a Web Push notification to a single subscription.
 * Throws on network error so BullMQ can retry.
 * The caller is responsible for handling 410/404 (expired subscription).
 */
export async function sendWebPush(
  subscription: webpush.PushSubscription,
  payload: object,
): Promise<void> {
  await webpush.sendNotification(subscription, JSON.stringify(payload))
}
