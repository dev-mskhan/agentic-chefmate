/**
 * Fetches user notification preferences from the user-service.
 * Used to check quiet hours, opted-out channels, etc.
 *
 * This is a stub — in production it calls the user-service HTTP API.
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

/**
 * Returns default preferences (all channels enabled) until user-service is wired up.
 */
export async function getUserPrefs(userId: string): Promise<UserNotificationPrefs> {
  // TODO: call user-service GET /api/v1/users/:userId/notification-prefs
  return {
    userId,
    channels: { email: true, push: true, inapp: true },
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
    } else {
      // Overnight quiet hours (e.g. 22–7)
      return !(hour >= quietHoursStart || hour < quietHoursEnd)
    }
  }

  return true
}
