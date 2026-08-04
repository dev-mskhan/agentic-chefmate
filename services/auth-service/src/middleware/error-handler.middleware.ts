import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { AppError, REQUEST_ID_HEADER } from "@platform/shared-types";
import type { Logger } from "@platform/logger";

/**
 * Maps AppError subclasses (and Zod validation errors) to ApiErrorResponse,
 * and treats anything unexpected as a logged 500. Registered last, after all
 * routes, so every thrown error in the request cycle lands here.
 */
export function createErrorHandler(logger: Logger): ErrorRequestHandler {
  return (err, req, res, next) => {
    if (res.headersSent) {
      next(err);
      return;
    }

    const rawRequestId = req.headers[REQUEST_ID_HEADER];
    const meta = {
      requestId: Array.isArray(rawRequestId) ? rawRequestId[0] : rawRequestId,
    };

    if (err instanceof AppError) {
      res.status(err.httpStatus).json({
        success: false,
        error: { code: err.code, message: err.message, details: err.details },
        meta,
      });
      return;
    }

    if (err instanceof ZodError) {
      const details = err.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      }));
      res.status(400).json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Invalid request", details },
        meta,
      });
      return;
    }

    logger.error({ err }, "Unhandled error");
    res.status(500).json({
      success: false,
      error: { code: "INTERNAL_SERVER_ERROR", message: "Internal server error" },
      meta,
    });
  };
}
