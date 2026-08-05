/**
 * Base application error class.
 * All domain errors extend this class so callers can distinguish operational
 * errors (expected, safe to surface to clients) from programmer errors.
 */
export class AppError extends Error {
  readonly statusCode: number
  readonly code: string
  readonly isOperational: boolean
  readonly details?: unknown

  constructor(
    message: string,
    statusCode: number,
    code: string,
    isOperational = true,
    details?: unknown,
  ) {
    super(message)
    // Restore prototype chain broken by extending built-ins in ES5 targets
    Object.setPrototypeOf(this, new.target.prototype)
    this.name = new.target.name
    this.statusCode = statusCode
    this.code = code
    this.isOperational = isOperational
    this.details = details
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, new.target)
    }
  }
}

// ─── 4xx Client Errors ────────────────────────────────────────────────────────

export class ValidationError extends AppError {
  constructor(message = 'Validation failed', details?: unknown) {
    super(message, 400, 'VALIDATION_ERROR', true, details)
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized', details?: unknown) {
    super(message, 401, 'UNAUTHORIZED', true, details)
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden', details?: unknown) {
    super(message, 403, 'FORBIDDEN', true, details)
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Not found', details?: unknown) {
    super(message, 404, 'NOT_FOUND', true, details)
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflict', details?: unknown) {
    super(message, 409, 'CONFLICT', true, details)
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Too many requests', details?: unknown) {
    super(message, 429, 'RATE_LIMIT_EXCEEDED', true, details)
  }
}

// ─── 5xx Server Errors ────────────────────────────────────────────────────────

export class InternalError extends AppError {
  constructor(message = 'Internal server error', details?: unknown) {
    // isOperational=false — these are programmer errors, not expected domain errors
    super(message, 500, 'INTERNAL_ERROR', false, details)
  }
}

// ─── Utilities ────────────────────────────────────────────────────────────────

/**
 * Type guard — narrows an unknown thrown value to AppError.
 */
export function isDomainError(err: unknown): err is AppError {
  return err instanceof AppError
}

export interface HttpErrorResponse {
  error: {
    code: string
    message: string
    details?: unknown
  }
}

/**
 * Converts any thrown value into a JSON-serialisable HTTP error response.
 * Stack traces are stripped in production to avoid leaking internals.
 */
export function toHttpResponse(err: unknown): HttpErrorResponse {
  if (isDomainError(err)) {
    return {
      error: {
        code: err.code,
        message: err.message,
        ...(err.details !== undefined ? { details: err.details } : {}),
      },
    }
  }

  // Unknown / programmer error — hide details in production
  const isProd = process.env['NODE_ENV'] === 'production'
  return {
    error: {
      code: 'INTERNAL_ERROR',
      message: isProd
        ? 'An unexpected error occurred'
        : err instanceof Error
          ? err.message
          : String(err),
    },
  }
}
