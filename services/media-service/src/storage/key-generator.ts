import { v4 as uuidv4 } from 'uuid'

export const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'video/mp4': 'mp4',
}

export interface GenerateObjectKeyParams {
  ownerType: 'chef' | 'dish' | 'plan'
  ownerId: string
  contextId?: string // dishId when ownerType === 'dish'
  mimeType: string
}

/**
 * Generates a UUID-based object key for S3/MinIO storage.
 * Extension is derived from mimeType — never from client-supplied filename.
 * No user input appears in the key, preventing path traversal attacks.
 */
export function generateObjectKey(params: GenerateObjectKeyParams): string {
  const ext = MIME_TO_EXT[params.mimeType] ?? 'bin'
  const uuid = uuidv4()

  if (params.ownerType === 'dish' && params.contextId) {
    return `chefs/${params.ownerId}/dishes/${params.contextId}/${uuid}.${ext}`
  }

  return `chefs/${params.ownerId}/portfolio/${uuid}.${ext}`
}
