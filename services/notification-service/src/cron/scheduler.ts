import Redis from 'ioredis'
import { createLogger } from '@chefmate/logger'
import { config } from '../config'
import { Notification } from '../models/notification.model'
import { getInAppQueue } from '../queues/notification.queue'
import { deriveNotificationId } from '../utils/idempotency'
import { reprocessDLQ } from '../utils/retry-failed'

const logger = createLogger('notification-cron')

const LEADER_LOCK_KEY = 'notification:cron:leader'
const LEADER_TTL_SECONDS = 60

async function dispatchUnreadDigest(): Promise<void> {
  const userIds = await Notification.distinct('userId', {
    'channelStatus.inApp.unread': true,
  })

  if (userIds.length === 0) {
    logger.info('No unread in-app notifications eligible for digest')
    return
  }

  const inappQueue = getInAppQueue()

  for (const userId of userIds.slice(0, 50)) {
    const unreadCount = await Notification.countDocuments({
      userId,
      'channelStatus.inApp.unread': true,
    })

    const notificationId = deriveNotificationId('scheduled.digest', userId, String(Date.now()))
    await inappQueue.add(
      'send-notification',
      {
        channel: 'inapp',
        template: 'digest-summary',
        userId,
        notificationId,
        data: { unreadCount },
      },
      { jobId: notificationId },
    )
  }
}

async function runCronCycle(redis: Redis): Promise<void> {
  const instanceId = config.INSTANCE_ID ?? 'notification-service'
  const acquired = await redis.set(LEADER_LOCK_KEY, instanceId, 'EX', LEADER_TTL_SECONDS, 'NX')
  if (!acquired) {
    logger.debug({ instanceId }, 'Skipping cron cycle — another instance holds the leader lock')
    return
  }

  try {
    logger.info({ instanceId }, 'Running notification cron cycle (leader)')

    await reprocessDLQ()
    await dispatchUnreadDigest()
  } finally {
    await redis.del(LEADER_LOCK_KEY)
  }
}

export function startNotificationCron(redis: Redis): () => Promise<void> {
  const interval = setInterval(() => {
    void runCronCycle(redis)
  }, 60_000)

  return async () => {
    clearInterval(interval)
    await redis.del(LEADER_LOCK_KEY)
  }
}
