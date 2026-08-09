import sharp from 'sharp'
import { createLogger } from '@chefmate/logger'

const logger = createLogger('thumbnail-service')

const IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

export async function generateThumbnail(
  inputBuffer: Buffer,
  mimeType: string,
): Promise<{ buffer: Buffer; width: number; height: number } | null> {
  // Skip non-image types
  if (!IMAGE_MIME_TYPES.has(mimeType)) {
    return null
  }

  try {
    const result = await sharp(inputBuffer)
      .resize(300, 300, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer({ resolveWithObject: true })

    return {
      buffer: result.data,
      width: result.info.width,
      height: result.info.height,
    }
  } catch (err) {
    logger.error({ err }, 'Failed to generate thumbnail')
    return null
  }
}
