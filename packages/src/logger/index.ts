import pino from 'pino'

export const piiScrubber = {
  serializers: {
    req(req: {
      method?: string
      url?: string
      hostname?: string
      remoteAddress?: string
      headers?: Record<string, unknown>
    }): Record<string, unknown> {
      // Whitelist only the fields useful for debugging — never spread the raw object
      const out: Record<string, unknown> = {
        method:        req.method,
        url:           req.url,
        hostname:      req.hostname,
        remoteAddress: req.remoteAddress,
      }

      // Include a stripped-down headers object (drop cookie + auth)
      if (req.headers && typeof req.headers === 'object') {
        const { cookie, authorization, ...safeHeaders } = req.headers as Record<string, unknown>
        out['headers'] = safeHeaders
      }

      return out
    },

    res(res: { statusCode?: number }): Record<string, unknown> {
      return { statusCode: res.statusCode }
    },
  },

  redactPaths: [
    '*.password',
    '*.passwordHash',
    '*.token',
    '*.accessToken',
    '*.refreshToken',
    'req.headers.authorization',
    'req.headers.cookie',
  ],
}

/**
 * Returns Fastify-compatible logger options.
 * In dev: uses pino-pretty transport for readable colourised output.
 * In prod: plain JSON for log aggregators.
 *
 * Pass the return value directly to Fastify({ logger: createFastifyLogger('svc') })
 */
export function createFastifyLogger(service: string): pino.LoggerOptions | pino.Logger {
  const isDev = process.env['NODE_ENV'] !== 'production'
  const level = process.env['LOG_LEVEL'] ?? 'info'

  const base: pino.LoggerOptions = {
    name: service,
    level,
    timestamp: pino.stdTimeFunctions.isoTime,
    redact: { paths: piiScrubber.redactPaths, censor: '[Redacted]' },
    serializers: {
      ...piiScrubber.serializers,
    },
  }

  if (isDev) {
    return pino(
      base,
      pino.transport({
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:dd mmm yyyy HH:MM:ss',
          ignore: 'pid,hostname',
          messageFormat: '{name} | {msg}',
          errorLikeObjectKeys: ['err', 'error'],
          singleLine: false,
        },
      }),
    ) as unknown as pino.LoggerOptions
  }

  return base
}

/**
 * Standalone logger for non-HTTP use (startup messages, background jobs).
 * Uses the same transport as createFastifyLogger.
 */
export function createLogger(service: string): pino.Logger {
  const isDev = process.env['NODE_ENV'] !== 'production'
  const level = process.env['LOG_LEVEL'] ?? 'info'

  const options: pino.LoggerOptions = {
    name: service,
    level,
    timestamp: pino.stdTimeFunctions.isoTime,
    redact: { paths: piiScrubber.redactPaths, censor: '[Redacted]' },
    serializers: piiScrubber.serializers,
  }

  if (isDev) {
    return pino(
      options,
      pino.transport({
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:dd mmm yyyy HH:MM:ss',
          ignore: 'pid,hostname',
          messageFormat: '{name} | {msg}',
        },
      }),
    )
  }

  return pino(options)
}

export function withTraceId(logger: pino.Logger, traceId: string): pino.Logger {
  return logger.child({ traceId })
}

export type { Logger } from 'pino'
