import fp from 'fastify-plugin'
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { fastifyTRPCPlugin } from '@trpc/server/adapters/fastify'
import { appRouter } from '../trpc/router'
import { createContext } from '../trpc/context'

/**
 * Flattens tRPC's default HTTP envelope into a clean flat shape.
 *
 * tRPC success wire format:  { result: { data: <payload> } }
 * tRPC error wire format:    { error: { message, code, data: { code, httpStatus, errors? } } }
 *
 * We transform these into:
 *   Success: { success: true,  statusCode: 200, message: "Success",        data: <payload> }
 *   Error:   { success: false, statusCode: 400, message: "...",            errors?: [...] }
 */
function flattenTRPCResponse(
  payload: string,
  statusCode: number,
): string {
  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(payload) as Record<string, unknown>
  } catch {
    return payload // not JSON — leave untouched
  }

  // ── Success path ──────────────────────────────────────────────────────────
  if ('result' in parsed) {
    const result = parsed['result'] as Record<string, unknown>
    const data   = result?.['data']

    return JSON.stringify({
      success:    true,
      statusCode,
      message:    'Success',
      data:       data ?? null,
    })
  }

  // ── Error path ────────────────────────────────────────────────────────────
  if ('error' in parsed) {
    const error      = parsed['error'] as Record<string, unknown>
    const errorData  = error?.['data'] as Record<string, unknown> | undefined
    const message    = (error?.['message'] as string) ?? 'An error occurred'
    const httpStatus = (errorData?.['httpStatus'] as number) ?? statusCode
    const errors     = errorData?.['errors'] as unknown[] | undefined

    const body: Record<string, unknown> = {
      success:    false,
      statusCode: httpStatus,
      message,
    }
    if (errors && errors.length > 0) body['errors'] = errors

    return JSON.stringify(body)
  }

  return payload // unknown shape — leave untouched
}

export default fp(async function trpcPlugin(fastify: FastifyInstance) {
  // Register the tRPC adapter
  await fastify.register(fastifyTRPCPlugin, {
    prefix: '/api/v1/auth/trpc',
    trpcOptions: {
      router:        appRouter,
      createContext,
      onError({ error, path }) {
        fastify.log.error({ err: error, path }, 'tRPC error')
      },
    },
  })

  // Intercept all responses under the tRPC prefix and flatten them
  fastify.addHook(
    'onSend',
    async (
      request: FastifyRequest,
      reply:   FastifyReply,
      payload: unknown,
    ): Promise<unknown> => {
      if (!request.url.startsWith('/api/v1/auth/trpc')) return payload
      if (typeof payload !== 'string')                    return payload

      const contentType = reply.getHeader('content-type') as string | undefined
      if (!contentType?.includes('application/json'))     return payload

      return flattenTRPCResponse(payload, reply.statusCode)
    },
  )

  fastify.log.info('tRPC router registered at /api/v1/auth/trpc')
})
