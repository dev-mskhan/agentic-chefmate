import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { Notification } from '../../models/notification.model'
import { DLQEntry } from '../../models/dead-letter-queue.model'

export async function notificationRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.headers['x-user-id'] as string | undefined
    const query = request.query as { limit?: string }
    const limit = Math.min(Math.max(Number(query.limit ?? 50) || 50, 1), 100)

    if (!userId) {
      return reply.code(400).send({ statusCode: 400, message: 'Missing x-user-id header' })
    }

    const notifications = await Notification.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()

    return reply.code(200).send({ statusCode: 200, notifications })
  })

  fastify.get('/dlq', async (request: FastifyRequest, reply: FastifyReply) => {
    const role = request.headers['x-user-role'] as string | undefined
    if (role !== 'ADMIN') {
      return reply.code(403).send({ statusCode: 403, message: 'Admin role required' })
    }

    const query = request.query as { notificationId?: string; limit?: string }
    const limit = Math.min(Math.max(Number(query.limit ?? 50) || 50, 1), 100)
    const filter = query.notificationId ? { notificationId: query.notificationId } : {}
    const entries = await DLQEntry.find(filter).sort({ failedAt: -1 }).limit(limit).lean()
    return reply.code(200).send({ statusCode: 200, entries })
  })

  fastify.get('/unread-count', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request.headers['x-user-id'] as string | undefined) ?? (request.query as { userId?: string }).userId
    if (!userId) {
      return reply.code(400).send({ statusCode: 400, message: 'Missing x-user-id header or userId query param' })
    }

    const count = await Notification.countDocuments({
      userId,
      'channelStatus.inApp.unread': true,
    })

    return reply.code(200).send({ statusCode: 200, count })
  })

  fastify.post('/:notificationId/read', async (request: FastifyRequest<{ Params: { notificationId: string } }>, reply: FastifyReply) => {
    const userId = (request.headers['x-user-id'] as string | undefined) ?? (request.query as { userId?: string }).userId
    const { notificationId } = request.params

    if (!userId) {
      return reply.code(400).send({ statusCode: 400, message: 'Missing x-user-id header or userId query param' })
    }

    const result = await Notification.updateOne(
      { _id: notificationId, userId },
      { $set: { 'channelStatus.inApp.unread': false } },
    )

    return reply.code(200).send({
      statusCode: 200,
      updated: result.modifiedCount > 0,
      notificationId,
    })
  })
}
