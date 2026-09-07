import Redis from 'ioredis'

const PROCESSED_EVENT_TTL_SECONDS = 24 * 60 * 60

let redis: Redis | null = null

function getRedis(): Redis {
  if (!redis) {
    const redisUrl = process.env.REDIS_URL
    if (!redisUrl) throw new Error('REDIS_URL is required for event idempotency')
    redis = new Redis(redisUrl, { maxRetriesPerRequest: null })
  }
  return redis
}

function processedKey(eventId: string): string {
  if (!eventId) throw new Error('eventId is required for event idempotency')
  return `processed:${eventId}`
}

export async function isEventProcessed(eventId: string): Promise<boolean> {
  return (await getRedis().exists(processedKey(eventId))) === 1
}

export async function markEventProcessed(eventId: string): Promise<void> {
  await getRedis().set(processedKey(eventId), '1', 'EX', PROCESSED_EVENT_TTL_SECONDS)
}
