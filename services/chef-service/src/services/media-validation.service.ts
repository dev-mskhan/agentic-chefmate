import { ValidationError } from '@chefmate/errors'

/**
 * Validates that a set of mediaIds exist in the media-service, are READY,
 * and belong to the specified ownerId.
 *
 * Calls the media-service internal route POST /api/v1/media/internal/validate-media
 * with the x-internal-secret header for service-to-service authentication.
 *
 * Throws ValidationError if any mediaId is invalid (not found, not owned,
 * or not READY).
 */
export async function validateMediaOwnership(
  mediaServiceUrl: string,
  internalSecret: string,
  mediaIds: string[],
  ownerId: string,
): Promise<void> {
  if (mediaIds.length === 0) return

  const url = `${mediaServiceUrl}/internal/media/validate`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-internal-secret': internalSecret,
    },
    body: JSON.stringify({ mediaIds, ownerId }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Media validation call failed: ${res.status} ${text}`)
  }

  const body = (await res.json()) as { valid: boolean; invalidIds: string[] }
  if (!body.valid || body.invalidIds.length > 0) {
    throw new ValidationError(`Invalid media references: ${body.invalidIds.join(', ')}`)
  }
}
