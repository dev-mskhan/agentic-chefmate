/**
 * Names that must match EXACTLY across services (queue names, pub/sub
 * channels, headers). Keeping these as shared constants instead of
 * string literals in each service prevents typo-drift between, say,
 * repo-service enqueuing a job and indexing-service listening for it.
 */

export const REQUEST_ID_HEADER = "x-request-id";

/** BullMQ queue names (spec §9.3 — repo-service → indexing-service). */
export const QUEUE_NAMES = {
  INGESTION: "ingestion-queue",
  RE_INDEX: "re-index-queue",
  /** auth-service durable background jobs (§4.7 of the auth-gateway spec). */
  AUTH_WELCOME_EMAIL: "auth:welcome-email",
  AUTH_AUDIT_LOG: "auth:audit-log",
} as const;

/** Redis pub/sub channels (spec §9.3 — progress events → notification-service). */
export const PUBSUB_CHANNELS = {
  INGESTION_PROGRESS: "ingestion:progress",
  AGENT_RUN_UPDATE: "agent-run:update",
  /** auth-service real-time auth events — login/logout/session.revoked (§4.4.4). */
  AUTH_EVENTS: "auth:events",
} as const;

/** SSE event names (spec §9.3 — chat-service → client token streaming). */
export const SSE_EVENTS = {
  TOKEN: "token",
  CITATION: "citation",
  DONE: "done",
  ERROR: "error",
} as const;
