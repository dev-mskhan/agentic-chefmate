import { createLogger } from '@chefmate/logger'
import { config } from '../config'

const logger = createLogger('notification-user-prefs')

/**
 * Fetches user notification preferences from the user-service.
 * Used to check quiet hours, opted-out channels, etc.
 */
export interface UserNotificationPrefs {
  userId: string
  channels: {
    email: boolean
    push: boolean
    inapp: boolean
  }
  quietHoursStart?: number  // 0–23
  quietHoursEnd?: number    // 0–23
}

function parseQuietHour(value?: string): number | undefined {
  if (!value) return undefined
  const [hour] = value.split(':')
  const parsed = Number(hour)
  return Number.isFinite(parsed) ? parsed : undefined
}

function normalizePrefs(userId: string, raw: any): UserNotificationPrefs {
  const channels = raw?.channels ?? {}
  const quietHours = raw?.quietHours ?? {}
  const quietHoursStart = parseQuietHour(quietHours.start)
  const quietHoursEnd = parseQuietHour(quietHours.end)

  return {
    userId,
    channels: {
      email: Boolean(channels.email ?? true),
      push: Boolean(channels.push ?? true),
      inapp: Boolean(channels.inApp ?? channels.inapp ?? true),
    },
    quietHoursStart: quietHours.enabled ? quietHoursStart : undefined,
    quietHoursEnd: quietHours.enabled ? quietHoursEnd : undefined,
  }
}

export async function getUserPrefs(userId: string): Promise<UserNotificationPrefs> {
  const base = config.USER_SERVICE_URL!
  const inputParam = encodeURIComponent(JSON.stringify({}))
  const url = `${base}/api/v1/users/trpc/getNotifPrefs?input=${inputParam}`

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': userId,
        'X-User-Role': 'USER',
        'X-User-Email': `${userId}@local.test`,
      },
    })

    if (!response.ok) {
      throw new Error(`User service returned ${response.status}`)
    }

    const body = await response.json() as any
    const payload = body?.data ?? body?.result?.data ?? {}
    return normalizePrefs(userId, payload)
  } catch (err) {
    logger.warn({ userId, err }, 'Failed to fetch user notification prefs; fail-closed')
    return {
      userId,
      channels: { email: false, push: false, inapp: false },
    }
  }
}

/**
 * Returns true if the user has opted in to the given channel
 * and is not currently in quiet hours.
 */
export async function canNotify(
  userId: string,
  channel: 'email' | 'push' | 'inapp',
): Promise<boolean> {
  const prefs = await getUserPrefs(userId)
  if (!prefs.channels[channel]) return false

  if (prefs.quietHoursStart !== undefined && prefs.quietHoursEnd !== undefined) {
    const hour = new Date().getHours()
    const { quietHoursStart, quietHoursEnd } = prefs
    if (quietHoursStart < quietHoursEnd) {
      return !(hour >= quietHoursStart && hour < quietHoursEnd)
    }
    return !(hour >= quietHoursStart || hour < quietHoursEnd)
  }

  return true
}

export async function getUserEmail(userId: string): Promise<string> {
  const response = await fetch(
    `${config.AUTH_SERVICE_URL}/api/v1/auth/trpc/getUserContact`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': config.INTERNAL_SECRET!,
      },
      body: JSON.stringify({ '0': { json: { userId } } }),
    },
  )

  const body = await response.json() as any
  if (!response.ok) {
    throw new Error(`Auth service returned ${response.status} while resolving user email`)
  }

  const email = body?.[0]?.result?.data?.email ?? body?.result?.data?.email
  if (typeof email !== 'string' || email.length === 0) {
    throw new Error(`Auth service returned no email for user ${userId}`)
  }
  return email
}
