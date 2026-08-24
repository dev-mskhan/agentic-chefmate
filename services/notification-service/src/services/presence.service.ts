import type Redis from 'ioredis'

export function startNotificationPresence(redis: Redis, instanceId: string): () => Promise<void> {
  const key = `notification:presence:${instanceId}`
  const writePresence = async () => {
    await redis.set(
      key,
      JSON.stringify({ service: 'notification-service', instanceId, updatedAt: new Date().toISOString() }),
      'EX',
      30,
    )
  }

  void writePresence()
  const interval = setInterval(() => {
    void writePresence()
  }, 10_000)

  return async () => {
    clearInterval(interval)
    await redis.del(key)
  }
}
