/**
 * Base class for all operational (expected) errors across services.
 * Gateway/service error middleware should catch AppError, map it to
 * ApiErrorResponse using `code` and `httpStatus`, and log unexpected
 * (non-AppError) errors as 500s separately.
 */
export class AppError extends Error {
  public readonly httpStatus: number;
  public readonly code: string;
  public readonly details?: unknown;
  public readonly isOperational = true;

  constructor(message: string, httpStatus: number, code: string, details?: unknown) {
    super(message);
    this.name = this.constructor.name;
    this.httpStatus = httpStatus;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super(
      id ? `${resource} with id "${id}" was not found` : `${resource} was not found`,
      404,
      "NOT_FOUND",
    );
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 400, "VALIDATION_ERROR", details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Authentication required") {
    super(message, 401, "UNAUTHORIZED");
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "You do not have access to this resource") {
    super(message, 403, "FORBIDDEN");
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, "CONFLICT");
  }
}

export class RateLimitError extends AppError {
  constructor(message = "Too many requests") {
    super(message, 429, "RATE_LIMITED");
  }
}

export class UpstreamServiceError extends AppError {
  constructor(serviceName: string, message?: string) {
    super(message ?? `Upstream service "${serviceName}" failed`, 502, "UPSTREAM_SERVICE_ERROR");
  }
}
