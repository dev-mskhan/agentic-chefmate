import fp from 'fastify-plugin'
import type {
  FastifyInstance,
  FastifyRequest,
  FastifyReply,
} from 'fastify'
import {
  fastifyTRPCPlugin,
  type FastifyTRPCPluginOptions,
} from '@trpc/server/adapters/fastify'
import type { AnyRouter } from '@trpc/server'

// ─── Response Types ───────────────────────────────────────────────────────────

export interface TRPCSuccessResponse<T = unknown> {
  statusCode: number
  data: T
  message: string
}

/** The wire format for a failed tRPC response. */
export interface TRPCErrorResponse {
  statusCode: number
  data?: unknown
  message: string
  errors?: Array<{
    path: string
    message: string
  }>
}

export type TRPCResponse<T = unknown> =
  | TRPCSuccessResponse<T>
  | TRPCErrorResponse

// ─── Core Transformer ─────────────────────────────────────────────────────────

/**
 * Transforms tRPC's default HTTP wire format into ChefMate's
 * standard response envelope.
 *
 * tRPC success:
 * {
 *   result: {
 *     data: <payload>
 *   }
 * }
 *
 * tRPC error:
 * {
 *   error: {
 *     message: "...",
 *     code: ...,
 *     data: {
 *       code: "...",
 *       httpStatus: 400,
 *       errors?: [...],
 *       stack?: "..."
 *     }
 *   }
 * }
 *
 * ChefMate success:
 * {
 *   statusCode: 200,
 *   data: <payload>,
 *   message: "Success"
 * }
 *
 * ChefMate error:
 * {
 *   statusCode: 400,
 *   data: <error details>,
 *   message: "..."
 * }
 *
 * This function never throws.
 * If the payload cannot be parsed or has an unknown shape,
 * the original payload is returned unchanged.
 */
export function flattenTRPCResponse(
  payload: string,
  statusCode: number,
): string {
  let parsed: Record<string, unknown>

  try {
    parsed = JSON.parse(payload) as Record<string, unknown>
  } catch {
    // Not JSON — leave the payload untouched.
    return payload
  }

  // ── Success ────────────────────────────────────────────────────────────────

  if ('result' in parsed) {
    const result = parsed.result

    if (
      !result ||
      typeof result !== 'object' ||
      !('data' in result)
    ) {
      return payload
    }

    const resultObject = result as Record<string, unknown>

    const body: TRPCSuccessResponse = {
      statusCode: statusCode,
      data: resultObject.data,
      message: 'Success',
    }

    return JSON.stringify(body)
  }

  // ── Error ──────────────────────────────────────────────────────────────────

  if ('error' in parsed) {
    const error = parsed.error

    if (!error || typeof error !== 'object') {
      return payload
    }

    const errorObject = error as Record<string, unknown>

    const errorData =
      errorObject.data &&
      typeof errorObject.data === 'object'
        ? (errorObject.data as Record<string, unknown>)
        : undefined

    const message =
      typeof errorObject.message === 'string'
        ? errorObject.message
        : 'An error occurred'

    const httpStatus =
      typeof errorData?.httpStatus === 'number'
        ? errorData.httpStatus
        : statusCode

    const errors =
      Array.isArray(errorData?.errors)
        ? (errorData.errors as Array<{
            path: string
            message: string
          }>)
        : undefined

    const body: TRPCErrorResponse = {
      statusCode: httpStatus,
      message,
    }

    if (errorData) {
      body.data = errorData
    }

    return JSON.stringify(body)
  }

  // Unknown response shape — leave untouched.
  return payload
}

// ─── Plugin Options ───────────────────────────────────────────────────────────

export interface CreateTrpcPluginOptions<
  TRouter extends AnyRouter,
> {
  /** URL prefix for the tRPC router. */
  prefix: string

  /** The tRPC app router. */
  router: TRouter

  /** Context factory function. */
  createContext: FastifyTRPCPluginOptions<TRouter>['trpcOptions']['createContext']
}

// ─── Plugin Factory ───────────────────────────────────────────────────────────

/**
 * Creates a Fastify plugin that:
 *
 * 1. Registers an onSend hook BEFORE tRPC routes.
 * 2. Registers the Fastify tRPC plugin.
 * 3. Converts tRPC's native response format into ChefMate's
 *    standard API response format.
 *
 * Success:
 *
 * {
 *   status: 200,
 *   data: {...}
 * }
 *
 * Error:
 *
 * {
 *   status: 400,
 *   message: "Validation failed",
 *   errors: [...]
 * }
 *
 * @example
 *
 * createTrpcPlugin({
 *   prefix: '/api/v1/auth/trpc',
 *   router: appRouter,
 *   createContext,
 * })
 */
export function createTrpcPlugin<
  TRouter extends AnyRouter,
>(
  options: CreateTrpcPluginOptions<TRouter>,
) {
  const {
    prefix,
    router,
    createContext,
  } = options

  return fp(async function trpcPlugin(
    fastify: FastifyInstance,
  ) {
    // ────────────────────────────────────────────────────────────────────────
    // IMPORTANT:
    //
    // Register the hook BEFORE registering the tRPC routes.
    //
    // Fastify attaches hooks to routes during route registration.
    // Therefore the hook needs to exist before fastifyTRPCPlugin registers
    // the tRPC routes.
    // ────────────────────────────────────────────────────────────────────────

    fastify.addHook(
      'onSend',
      async (
        request: FastifyRequest,
        reply: FastifyReply,
        payload: unknown,
      ): Promise<unknown> => {
        // Only transform responses belonging to this tRPC router.
        if (!request.url.startsWith(prefix)) {
          return payload
        }

        // Only transform JSON responses.
        const contentType = reply.getHeader(
          'content-type',
        ) as string | undefined

        if (!contentType?.includes('application/json')) {
          return payload
        }

        // Fastify may provide the payload as either a string or Buffer.
        let body: string

        if (typeof payload === 'string') {
          body = payload
        } else if (Buffer.isBuffer(payload)) {
          body = payload.toString('utf8')
        } else {
          // Unknown payload type — do not modify it.
          return payload
        }

        return flattenTRPCResponse(
          body,
          reply.statusCode,
        )
      },
    )

    // ────────────────────────────────────────────────────────────────────────
    // Register tRPC AFTER the onSend hook.
    // ────────────────────────────────────────────────────────────────────────

    await fastify.register(
      fastifyTRPCPlugin,
      {
        prefix,

        trpcOptions: {
          router,
          createContext,

          onError({
            error,
            path,
          }: {
            error: unknown
            path: string | undefined
          }) {
            fastify.log.error(
              {
                err: error,
                path,
              },
              'tRPC error',
            )
          },
        },
      },
    )

    fastify.log.info(
      `tRPC router registered at ${prefix}`,
    )
  })
}