import { randomUUID } from "node:crypto";
import { pinoHttp, type HttpLogger } from "pino-http";
import { createLogger } from "./logger.js";
import type { RequestLoggerOptions } from "./types.js";

/**
 * Creates an Express/Connect-compatible request logging middleware.
 *
 * - Generates or forwards a correlation id (x-request-id by default) so a
 *   single request can be traced across gateway -> service -> service.
 * - Logs one line per request/response with method, url, status, duration.
 * - Reuses createLogger() so field shape matches the rest of the platform.
 *
 * Usage (per service):
 *   const { logger, httpLogger } = createHttpLogger({ serviceName: "chat-service" });
 *   app.use(httpLogger);
 *   app.get("/health", (req, res) => { req.log.info("health check"); res.sendStatus(200); });
 */
export function createHttpLogger(options: RequestLoggerOptions): {
  logger: ReturnType<typeof createLogger>;
  httpLogger: HttpLogger;
} {
  const logger = createLogger(options);
  const requestIdHeader = options.requestIdHeader ?? "x-request-id";

  const httpLogger = pinoHttp({
    logger,
    genReqId: (req, res) => {
      const existing = req.headers[requestIdHeader];
      const id = (Array.isArray(existing) ? existing[0] : existing) ?? randomUUID();
      res.setHeader(requestIdHeader, id);
      return id;
    },
    customLogLevel: (_req, res, err) => {
      if (err || res.statusCode >= 500) return "error";
      if (res.statusCode >= 400) return "warn";
      return "info";
    },
    customSuccessMessage: (req, res) => `${req.method} ${req.url} completed ${res.statusCode}`,
    customErrorMessage: (req, res, err) =>
      `${req.method} ${req.url} failed ${res.statusCode}: ${err.message}`,
  });

  return { logger, httpLogger };
}
