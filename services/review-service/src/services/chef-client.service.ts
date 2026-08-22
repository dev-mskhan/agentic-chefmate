/**
 * Chef client service for review-service to resolve chef profile ID from auth userId.
 */
import { config } from '../config'
import { ForbiddenError } from '@chefmate/errors'
import { createLogger } from '@chefmate/logger'

const logger = createLogger('review-service:chef-client')

export async function resolveChefId(userId: string, userEmail: string): Promise<string> {
  const base = config.CHEF_SERVICE_URL

  const res = await fetch(`${base}/api/v1/chefs/me`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'X-User-Id':    userId,
      'X-User-Role':  'CHEF',
      'X-User-Email': userEmail,
    },
  })

  if (res.status === 404) {
    throw new ForbiddenError('No chef profile found for this user')
  }
  if (!res.ok) {
    throw new ForbiddenError(`Could not resolve chef profile: ${res.status}`)
  }

  const body = await res.json() as {
    data?: { _id?: string; id?: string }
    _id?: string
    id?: string
  }

  const chefId = (body.data as any)?._id
    ?? (body.data as any)?.id
    ?? (body as any)._id
    ?? (body as any).id

  if (!chefId) {
    throw new ForbiddenError('Could not determine chefId from chef profile response')
  }

  return String(chefId)
}
