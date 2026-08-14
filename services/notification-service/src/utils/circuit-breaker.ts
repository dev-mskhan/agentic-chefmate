import Redis from 'ioredis'
import { config } from '../config'
import { createLogger } from '@chefmate/logger'

const logger = createLogger('notification-circuit-breaker')

type CircuitState = 'closed' | 'open' | 'half-open'

interface Circuit {
  state: CircuitState
  failureCount: number
  openedAt: number
}

const circuits = new Map<string, Circuit>()

/** Opens after this many consecutive failures. */
const FAILURE_THRESHOLD = 5
/** Milliseconds before a half-open probe is attempted. */
const RESET_TIMEOUT_MS  = 30_000

function getCircuit(name: string): Circuit {
  if (!circuits.has(name)) {
    circuits.set(name, { state: 'closed', failureCount: 0, openedAt: 0 })
  }
  return circuits.get(name)!
}

/**
 * Wraps an async function with a simple in-process circuit breaker.
 *
 * - CLOSED  → calls pass through normally.
 * - OPEN    → calls fail immediately (provider assumed down).
 * - HALF-OPEN → one probe call allowed; success closes, failure re-opens.
 *
 * When the circuit opens, a `logger.error` is emitted. Wire this up to
 * your `sendAlert()` service for a real oncall notification.
 */
export async function withCircuitBreaker<T>(
  name: string,
  fn: () => Promise<T>,
): Promise<T> {
  const circuit = getCircuit(name)

  if (circuit.state === 'open') {
    const elapsed = Date.now() - circuit.openedAt
    if (elapsed >= RESET_TIMEOUT_MS) {
      circuit.state = 'half-open'
      logger.info({ name }, 'Circuit half-open — probing provider')
    } else {
      throw new Error(
        `Circuit '${name}' is OPEN (provider unavailable). ` +
        `Retrying in ${Math.round((RESET_TIMEOUT_MS - elapsed) / 1000)}s.`,
      )
    }
  }

  try {
    const result = await fn()

    // Success — reset circuit
    if (circuit.state !== 'closed') {
      logger.info({ name }, 'Circuit closed — provider recovered')
    }
    circuit.failureCount = 0
    circuit.state = 'closed'
    return result
  } catch (err) {
    circuit.failureCount++
    circuit.openedAt = Date.now()

    if (circuit.failureCount >= FAILURE_THRESHOLD) {
      circuit.state = 'open'
      logger.error(
        { name, failureCount: circuit.failureCount },
        `Circuit '${name}' OPENED after ${circuit.failureCount} consecutive failures`,
      )
    }

    throw err
  }
}

// ── Redis-backed sliding-window failure counter ───────────────────────────────

let _redis: Redis | null = null

function getCounterRedis(): Redis {
  if (!_redis) {
    _redis = new Redis(config.REDIS_URL!, { maxRetriesPerRequest: null })
    _redis.on('error', (err) => logger.error({ err }, 'Failure-counter Redis error'))
  }
  return _redis
}

const WINDOW_SECONDS = 60 * 60 // 1 hour

/**
 * Increments a per-channel sliding-window failure counter in Redis.
 * Uses a sorted set keyed by Unix timestamp — entries older than the
 * window are pruned atomically with a pipeline. Returns the current count.
 *
 * O(log N) per call — far cheaper than `countDocuments()` in MongoDB.
 */
export async function incrementFailureCounter(channel: string): Promise<number> {
  const key   = `notif:failures:${channel}`
  const now   = Date.now()
  const start = now - WINDOW_SECONDS * 1000

  const pipeline = getCounterRedis().pipeline()
  pipeline.zremrangebyscore(key, '-inf', start)
  pipeline.zadd(key, now, `${now}-${Math.random()}`)
  pipeline.zcard(key)
  pipeline.expire(key, WINDOW_SECONDS + 60)

  const results = await pipeline.exec()
  return (results?.[2]?.[1] as number) ?? 0
}
