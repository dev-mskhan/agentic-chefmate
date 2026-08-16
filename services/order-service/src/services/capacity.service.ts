/**
 * Capacity coordination service.
 *
 * The chef-service's canChefAcceptOrder() function checks the Redis counter
 * at key `chef:{chefId}:orders:{YYYY-MM-DD}` to enforce daily order capacity.
 * The Order Service is the sole writer of this counter.
 *
 * This module maintains that counter:
 *  - increment: called when a new order is successfully created for a chef/date
 *  - decrement: called when an order is cancelled (to free capacity)
 *
 * The key TTL is set to 48 hours from now on every increment so it auto-expires.
 * Decrement uses a floor of 0 to prevent the counter from going negative.
 *
 * Key: chef:{chefId}:orders:{YYYY-MM-DD}
 */

import type Redis from 'ioredis'
import { createLogger } from '@chefmate/logger'

const logger = createLogger('order-capacity-service')

// 48 hours in seconds — gives room for late-night orders the day after
const COUNTER_TTL_SECONDS = 48 * 60 * 60

function counterKey(chefId: string, date: string): string {
  return `chef:${chefId}:orders:${date}`
}

/**
 * Increments the daily order counter for a chef.
 * Sets the TTL on the first increment (when the key doesn't exist yet).
 */
export async function incrementChefOrderCount(
  redis: Redis,
  chefId: string,
  date: string,
): Promise<void> {
  const key = counterKey(chefId, date)
  const count = await redis.incr(key)
  if (count === 1) {
    // First order for this date — set expiry so the key doesn't live forever
    await redis.expire(key, COUNTER_TTL_SECONDS)
  }
  logger.info({ chefId, date, count }, 'Chef daily order count incremented')
}

/**
 * Decrements the daily order counter for a chef (on cancellation).
 * Floors at 0 — the counter cannot go negative.
 */
export async function decrementChefOrderCount(
  redis: Redis,
  chefId: string,
  date: string,
): Promise<void> {
  const key = counterKey(chefId, date)
  const current = await redis.get(key)
  if (!current || parseInt(current, 10) <= 0) return
  await redis.decr(key)
  logger.info({ chefId, date }, 'Chef daily order count decremented')
}
