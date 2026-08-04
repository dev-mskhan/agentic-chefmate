import pino, { type Logger } from "pino";
import type { CreateLoggerOptions, LogLevel } from "./types.js";

const DEFAULT_LEVEL: LogLevel = "info";

/**
 * Creates a service-scoped pino logger.
 *
 * Every service in the platform (gateway, repo-service, indexing-service,
 * orchestrator-service, chat-service, notification-service, ...) should call
 * this once at startup and pass the resulting logger down instead of
 * constructing its own pino instance. That keeps log shape (fields, levels,
 * transport) identical across services, which matters once logs are
 * aggregated centrally.
 */
export function createLogger(options: CreateLoggerOptions): Logger {
  const { serviceName, base, level } = options;

  const isProduction = process.env.NODE_ENV === "production";
  const pretty = options.pretty ?? !isProduction;
  const resolvedLevel: LogLevel = level ?? (process.env.LOG_LEVEL as LogLevel) ?? DEFAULT_LEVEL;

  return pino({
    name: serviceName,
    level: resolvedLevel,
    base: {
      service: serviceName,
      env: process.env.NODE_ENV ?? "development",
      ...base,
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    // Never let secrets leak into log aggregation.
    redact: {
      paths: [
        "req.headers.authorization",
        "req.headers.cookie",
        "*.password",
        "*.token",
        "*.accessToken",
        "*.refreshToken",
        "*.apiKey",
      ],
      censor: "[REDACTED]",
    },
    transport: pretty
      ? {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:standard",
            ignore: "pid,hostname",
          },
        }
      : undefined,
  });
}
