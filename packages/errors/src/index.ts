/**
 * Base API error class matching the exact requested format.
 */
export class ApiError extends Error {
  statusCode: number
  data?: unknown

  constructor(statusCode: number, message: string, data?: unknown) {
    super(message)
    this.statusCode = statusCode
    this.data = data

    // Restore prototype chain broken by extending built-ins in ES5 targets
    Object.setPrototypeOf(this, new.target.prototype)
    this.name = new.target.name

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, new.target)
    }
  }
}

export default ApiError

// ─── 4xx Client Errors ────────────────────────────────────────────────────────
// Subclasses are preserved so existing code doesn't break, but they all
// extend the new ApiError and format their super() calls to match it.

export class ValidationError extends ApiError {
  constructor(message = 'Validation failed', data?: unknown) {
    super(400, message, data)
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message = 'Unauthorized', data?: unknown) {
    super(401, message, data)
  }
}

export class ForbiddenError extends ApiError {
  constructor(message = 'Forbidden', data?: unknown) {
    super(403, message, data)
  }
}

export class NotFoundError extends ApiError {
  constructor(message = 'Not found', data?: unknown) {
    super(404, message, data)
  }
}

export class ConflictError extends ApiError {
  constructor(message = 'Conflict', data?: unknown) {
    super(409, message, data)
  }
}

export class RateLimitError extends ApiError {
  constructor(message = 'Too many requests', data?: unknown) {
    super(429, message, data)
  }
}

// ─── 5xx Server Errors ────────────────────────────────────────────────────────

export class InternalError extends ApiError {
  constructor(message = 'Internal server error', data?: unknown) {
    super(500, message, data)
  }
}

// ─── Utilities ────────────────────────────────────────────────────────────────

/**
 * Type guard — narrows an unknown thrown value to ApiError.
 */
export function isDomainError(err: unknown): err is ApiError {
  return err instanceof ApiError
}

export interface HttpErrorResponse {
  statusCode: number
  message: string
  data?: unknown
}

/**
 * Converts any thrown value into the new standard JSON-serialisable HTTP error response.
 */
export function toHttpResponse(err: unknown): HttpErrorResponse {
  if (isDomainError(err)) {
    return {
      statusCode: err.statusCode,
      message: err.message,
      ...(err.data !== undefined ? { data: err.data } : {}),
    }
  }

  // Unknown / programmer error — hide details in production
  const isProd = process.env['NODE_ENV'] === 'production'
  return {
    statusCode: 500,
    message: isProd
      ? 'An unexpected error occurred'
      : err instanceof Error
        ? err.message
        : String(err),
  }
}
