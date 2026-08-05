import pino from 'pino'

// ─── PII Scrubber ─────────────────────────────────────────────────────────────

/**
 * Sensitive fields to strip from all log output.
 * pino's built-in redaction replaces matched paths with "[Redacted]".
 */
const SENSITIVE_FIELDS = [
  'password',
  'passwordHash',
  'token',
  'accessToken',
  'refreshToken',
  'authorization',
]

/**
 * piiScrubber provides:
 *  - A `req` serializer that strips sensitive fields from request bodies/headers
 *  - A `redactPaths` array for pino's built-in redaction engine
 */
export const piiScrubber = {
  /**
   * Custom serializer for the `req` binding. Strips sensitive fields from
   * body and headers before they reach the log transport.
   */
  serializers: {
    req(req: Record<string, unknown>): Record<string, unknown> {
      const scrubbed = { ...req }

      // Scrub top-level sensitive fields (e.g. body properties)
      for (const field of SENSITIVE_FIELDS) {
        if (field in scrubbed) {
          scrubbed[field] = '[Redacted]'
        }
      }

      // Scrub headers object
      if (scrubbed['headers'] && typeof scrubbed['headers'] === 'object') {
        const headers = { ...(scrubbed['headers'] as Record<string, unknown>) }
        for (const field of SENSITIVE_FIELDS) {
          if (field in headers) {
            headers[field] = '[Redacted]'
          }
          // Also handle lowercase header variants
          const lower = field.toLowerCase()
          if (lower in headers) {
            headers[lower] = '[Redacted]'
          }
        }
        scrubbed['headers'] = headers
      }

      // Scrub body object if present
      if (scrubbed['body'] && typeof scrubbed['body'] === 'object') {
        const body = { ...(scrubbed['body'] as Record<string, unknown>) }
        for (const field of SENSITIVE_FIELDS) {
          if (field in body) {
            body[field] = '[Redacted]'
          }
        }
        scrubbed['body'] = body
      }

      return scrubbed
    },
  },

  /**
   * Paths passed to pino's built-in `redact` option.
   * These cover deeply nested occurrences across any logged object.
   */
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

// ─── Logger Factory ───────────────────────────────────────────────────────────

/**
 * Creates a Pino logger bound to a specific service name.
 *
 * - In development (NODE_ENV !== 'production'): pretty-prints via pino-pretty
 * - In production: emits plain JSON for structured log aggregators
 * - Applies PII redaction via piiScrubber
 * - Log level controlled by LOG_LEVEL env var (default: 'info')
 */
export function createLogger(service: string): pino.Logger {
  const isDev = process.env['NODE_ENV'] !== 'production'
  const level = process.env['LOG_LEVEL'] ?? 'info'

  const options: pino.LoggerOptions = {
    name: service,
    level,
    timestamp: pino.stdTimeFunctions.isoTime,
    redact: {
      paths: piiScrubber.redactPaths,
      censor: '[Redacted]',
    },
    serializers: piiScrubber.serializers,
  }

  if (isDev) {
    return pino(
      options,
      pino.transport({
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      }),
    )
  }

  return pino(options)
}

// ─── Trace ID Binding ─────────────────────────────────────────────────────────

/**
 * Returns a child logger with `traceId` bound to every subsequent log line.
 * Use this to correlate all log entries for a single request or operation.
 */
export function withTraceId(logger: pino.Logger, traceId: string): pino.Logger {
  return logger.child({ traceId })
}

// ─── Re-exported Types ────────────────────────────────────────────────────────

export type { Logger } from 'pino'
