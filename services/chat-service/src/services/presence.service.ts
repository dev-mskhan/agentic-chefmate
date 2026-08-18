import type Redis from 'ioredis'

const PRESENCE_TTL = 86400 // 24h safety TTL

export async function setOnline(redis: Redis, userId: string): Promise<void> {
  await redis.set(`chat:presence:${userId}`, '1', 'EX', PRESENCE_TTL)
}

export async function setOffline(redis: Redis, userId: string): Promise<void> {
  await redis.del(`chat:presence:${userId}`)
}

export async function isOnline(redis: Redis, userId: string): Promise<boolean> {
  const result = await redis.exists(`chat:presence:${userId}`)
  return result === 1
}
