import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'
import { extractPrincipal } from '@chefmate/auth-clients'
import { ValidationError, NotFoundError, ForbiddenError, UnauthorizedError } from '@chefmate/errors'
import { MediaAsset } from '../../models/media-asset.model'
import type { ObjectStorage } from '../../storage/storage.interface'
import { generateObjectKey } from '../../storage/key-generator'
import { generateThumbnail } from '../../services/thumbnail.service'
import { publishMediaEvent } from '../../services/event.service'
import type { MediaConfig } from '../../config'

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
const ALLOWED_VIDEO_TYPES = ['video/mp4'] as const
const ALLOWED_MIME_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES]
const IMAGE_SIZE_LIMIT = 10 * 1024 * 1024   // 10 MB
const VIDEO_SIZE_LIMIT = 100 * 1024 * 1024  // 100 MB

function isImageType(mimeType: string): boolean {
  return (ALLOWED_IMAGE_TYPES as readonly string[]).includes(mimeType)
}

function getSizeLimit(mimeType: string): number {
  return isImageType(mimeType) ? IMAGE_SIZE_LIMIT : VIDEO_SIZE_LIMIT
}

interface MediaRoutesOptions {
  storage: ObjectStorage
  config: MediaConfig
}

const uploadBodySchema = z.object({
  ownerId: z.string(),
  ownerType: z.enum(['chef', 'dish', 'plan']),
  mimeType: z.string(),
  sizeBytes: z.number(),
  originalName: z.string().optional(),
})

const statusBodySchema = z.object({
  status: z.enum(['READY', 'FAILED']),
  width: z.number().optional(),
  height: z.number().optional(),
  durationSeconds: z.number().optional(),
  reason: z.string().optional(),
})

export async function mediaRoutes(
  fastify: FastifyInstance,
  opts: MediaRoutesOptions,
): Promise<void> {
  // POST /upload-url
  fastify.post('/upload-url', async (request, reply) => {
    let principal
    try {
      principal = extractPrincipal(request.headers as Record<string, string | string[] | undefined>)
    } catch {
      throw new UnauthorizedError()
    }

    const parsed = uploadBodySchema.safeParse(request.body)
    if (!parsed.success) {
      throw new ValidationError('Validation failed', parsed.error.flatten())
    }
    const body = parsed.data

    if (!ALLOWED_MIME_TYPES.includes(body.mimeType as typeof ALLOWED_MIME_TYPES[number])) {
      throw new ValidationError('Unsupported MIME type')
    }

    if (body.sizeBytes > getSizeLimit(body.mimeType)) {
      throw new ValidationError('File too large')
    }

    if (body.ownerType === 'chef') {
      const count = await MediaAsset.countDocuments({
        ownerId: body.ownerId,
        ownerType: 'chef',
        status: { $ne: 'DELETED' },
      })
      if (count >= 20) {
        throw new ValidationError('Media limit reached')
      }
    }

    const mediaId = uuidv4()
    const objectKey = generateObjectKey({
      ownerType: body.ownerType,
      ownerId: body.ownerId,
      mimeType: body.mimeType,
    })

    await MediaAsset.create({
      mediaId,
      ownerId: body.ownerId,
      ownerType: body.ownerType,
      mimeType: body.mimeType,
      sizeBytes: body.sizeBytes,
      objectKey,
      originalName: body.originalName,
      status: 'PENDING',
    })

    const { uploadUrl, expiresAt } = await opts.storage.getSignedUploadUrl(
      objectKey,
      body.mimeType,
      opts.config.SIGNED_URL_UPLOAD_EXPIRY,
    )

    await MediaAsset.updateOne({ mediaId }, { $set: { status: 'UPLOADING' } })

    void publishMediaEvent({
      type: 'media.uploaded',
      mediaId,
      chefId: body.ownerId,
      ownerType: body.ownerType,
      mimeType: body.mimeType,
      sizeBytes: body.sizeBytes,
      createdAt: new Date().toISOString(),
      version: '1',
    })

    return reply.code(201).send({ mediaId, uploadUrl, expiresAt })
  })

  // GET /:mediaId/download-url
  fastify.get('/:mediaId/download-url', async (request, reply) => {
    let principal
    try {
      principal = extractPrincipal(request.headers as Record<string, string | string[] | undefined>)
    } catch {
      throw new UnauthorizedError()
    }

    const { mediaId } = request.params as { mediaId: string }
    const asset = await MediaAsset.findOne({ mediaId })
    if (!asset) throw new NotFoundError(`Media asset not found: ${mediaId}`)

    if (asset.ownerId !== principal.userId && principal.role !== 'ADMIN') {
      throw new ForbiddenError()
    }

    const { downloadUrl, expiresAt } = await opts.storage.getSignedDownloadUrl(
      asset.objectKey!,
      opts.config.SIGNED_URL_DOWNLOAD_EXPIRY,
    )

    return reply.send({ mediaId, downloadUrl, expiresAt })
  })

  // PATCH /:mediaId/status
  fastify.patch('/:mediaId/status', async (request, reply) => {
    let principal
    try {
      principal = extractPrincipal(request.headers as Record<string, string | string[] | undefined>)
    } catch {
      throw new UnauthorizedError()
    }

    if (principal.role !== 'ADMIN') {
      throw new ForbiddenError()
    }

    const { mediaId } = request.params as { mediaId: string }
    const asset = await MediaAsset.findOne({ mediaId })
    if (!asset) throw new NotFoundError(`Media asset not found: ${mediaId}`)

    const parsed = statusBodySchema.safeParse(request.body)
    if (!parsed.success) {
      throw new ValidationError('Validation failed', parsed.error.flatten())
    }
    const body = parsed.data

    if (asset.status !== 'UPLOADING') {
      throw new ValidationError('Invalid state transition')
    }

    const now = new Date().toISOString()

    if (body.status === 'READY') {
      let thumbnailKey: string | undefined = undefined

      if (isImageType(asset.mimeType) && asset.objectKey) {
        try {
          const buf = await opts.storage.getBuffer(asset.objectKey)
          const thumb = await generateThumbnail(buf, asset.mimeType)
          if (thumb) {
            thumbnailKey = asset.objectKey.replace(/\.[^.]+$/, '_thumb.webp')
            await opts.storage.uploadBuffer(thumbnailKey, thumb.buffer, 'image/webp')
          }
        } catch (err) {
          fastify.log.error({ err }, 'Thumbnail generation failed — non-fatal')
        }
      }

      await MediaAsset.updateOne({ mediaId }, {
        $set: {
          status: 'READY',
          ...(body.width && { width: body.width }),
          ...(body.height && { height: body.height }),
          ...(thumbnailKey && { thumbnailKey }),
        },
      })

      void publishMediaEvent({
        type: 'media.ready',
        mediaId,
        chefId: asset.ownerId,
        thumbnailKey,
        createdAt: now,
        version: '1',
      })
    } else {
      await MediaAsset.updateOne({ mediaId }, { $set: { status: 'FAILED' } })

      void publishMediaEvent({
        type: 'media.failed',
        mediaId,
        chefId: asset.ownerId,
        reason: body.reason ?? 'Upload failed',
        createdAt: now,
        version: '1',
      })
    }

    const updated = await MediaAsset.findOne({ mediaId })
    return reply.send(updated)
  })

  // GET /:mediaId
  fastify.get('/:mediaId', async (request, reply) => {
    let principal
    try {
      principal = extractPrincipal(request.headers as Record<string, string | string[] | undefined>)
    } catch {
      throw new UnauthorizedError()
    }

    const { mediaId } = request.params as { mediaId: string }
    const asset = await MediaAsset.findOne({ mediaId })
    if (!asset) throw new NotFoundError(`Media asset not found: ${mediaId}`)

    if (asset.ownerId !== principal.userId && principal.role !== 'ADMIN') {
      throw new ForbiddenError()
    }

    return reply.send(asset)
  })

  // DELETE /:mediaId
  fastify.delete('/:mediaId', async (request, reply) => {
    let principal
    try {
      principal = extractPrincipal(request.headers as Record<string, string | string[] | undefined>)
    } catch {
      throw new UnauthorizedError()
    }

    const { mediaId } = request.params as { mediaId: string }
    const asset = await MediaAsset.findOne({ mediaId })
    if (!asset) throw new NotFoundError(`Media asset not found: ${mediaId}`)

    if (asset.ownerId !== principal.userId && principal.role !== 'ADMIN') {
      throw new ForbiddenError()
    }

    await MediaAsset.updateOne({ mediaId }, { $set: { status: 'DELETED' } })

    void publishMediaEvent({
      type: 'media.deleted',
      mediaId,
      chefId: asset.ownerId,
      createdAt: new Date().toISOString(),
      version: '1',
    })

    return reply.send({ mediaId, status: 'DELETED' })
  })

  // ─── Internal route: bulk media ownership validation ───────────────────────
  // Called by chef-service (or other services) to verify that a set of mediaIds
  // exist, are READY, and belong to the specified ownerId.
  // Authenticated via x-internal-secret header (service-to-service only).
  fastify.post('/internal/validate-media', async (request, reply) => {
    const secret = request.headers['x-internal-secret']
    const expectedSecret = opts.config.INTERNAL_SECRET
    if (!expectedSecret || secret !== expectedSecret) {
      throw new UnauthorizedError('Invalid internal secret')
    }

    const body = request.body as { mediaIds: string[]; ownerId: string }
    if (!body?.mediaIds || !Array.isArray(body.mediaIds) || !body.ownerId) {
      throw new ValidationError('mediaIds (string[]) and ownerId (string) are required')
    }

    const assets = await MediaAsset.find({
      mediaId: { $in: body.mediaIds },
      status: { $ne: 'DELETED' },
    }).lean()

    // Build a map of mediaId → { ownerId, status } for quick lookup
    const assetMap = new Map(assets.map((a) => [a.mediaId, { ownerId: a.ownerId, status: a.status }]))

    const results = body.mediaIds.map((mediaId) => {
      const asset = assetMap.get(mediaId)
      if (!asset) {
        return { mediaId, valid: false, reason: 'not_found' }
      }
      if (asset.ownerId !== body.ownerId) {
        return { mediaId, valid: false, reason: 'not_owned' }
      }
      if (asset.status !== 'READY') {
        return { mediaId, valid: false, reason: `status_${asset.status.toLowerCase()}` }
      }
      return { mediaId, valid: true }
    })

    return reply.send({ results })
  })
}
