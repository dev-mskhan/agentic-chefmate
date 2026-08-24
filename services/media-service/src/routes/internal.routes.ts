import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { UnauthorizedError, ValidationError } from '@chefmate/errors'
import { MediaAsset } from '../models/media-asset.model'
import { config } from '../config'

const validateBodySchema = z.object({
  mediaIds: z.array(z.string().min(1)),
  ownerId: z.string().min(1),
})

export async function internalMediaRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post('/internal/media/validate', async (request, reply) => {
    if (request.headers['x-internal-secret'] !== config.INTERNAL_SECRET) {
      throw new UnauthorizedError()
    }

    const parsed = validateBodySchema.safeParse(request.body)
    if (!parsed.success) {
      throw new ValidationError('Validation failed', parsed.error.flatten())
    }

    const { mediaIds, ownerId } = parsed.data
    if (mediaIds.length === 0) {
      return reply.send({ valid: true, invalidIds: [] })
    }

    const assets = await MediaAsset.find({
      mediaId: { $in: mediaIds },
    }).select('mediaId ownerId status').lean()

    const validIds = new Set(
      assets
        .filter((asset) => asset.ownerId === ownerId && asset.status === 'READY')
        .map((asset) => asset.mediaId),
    )
    const invalidIds = mediaIds.filter((mediaId) => !validIds.has(mediaId))

    return reply.send({
      valid: invalidIds.length === 0,
      invalidIds,
    })
  })
}
