export type LogLevel = "fatal" | "error" | "warn" | "info" | "debug" | "trace" | "silent";

export interface CreateLoggerOptions {
  /**
   * Name of the service emitting logs, e.g. "gateway", "repo-service",
   * "indexing-service". Attached to every log line so logs are filterable
   * per service once they land in a central sink (Loki / CloudWatch / etc).
   */
  serviceName: string;
  /**
   * Overrides LOG_LEVEL env var if provided.
   */
  level?: LogLevel;
  /**
   * Force pretty-printing regardless of NODE_ENV. Defaults to true when
   * NODE_ENV !== "production".
   */
  pretty?: boolean;
  /**
   * Additional static fields merged into every log line (e.g. version, region).
   */
  base?: Record<string, unknown>;
}

export interface RequestLoggerOptions extends CreateLoggerOptions {
  /**
   * Header used to read/propagate a correlation id across services.
   * Defaults to "x-request-id".
   */
  requestIdHeader?: string;
}
