import mongoose, { type Connection } from "mongoose";
import type { Logger } from "@platform/logger";

export interface ConnectDbOptions {
  /** Full Mongo connection string, WITHOUT a database name in the path. */
  uri: string;
  /**
   * Logical database name for this service, e.g. "repo_service_db",
   * "chat_service_db". Each service gets its own database on the same
   * cluster — see the architecture note in this file's docstring.
   */
  dbName: string;
  serviceName: string;
  logger: Logger;
  /** Defaults to a conservative pool size suitable for free-tier clusters. */
  maxPoolSize?: number;
}

/**
 * ── Database topology decision ──────────────────────────────────────────
 * Pattern: database-per-service, on ONE shared MongoDB cluster (Atlas free
 * tier for dev/staging; same pattern holds if you later move to a paid
 * cluster or self-hosted replica set).
 *
 * Why not one shared database for all services:
 *   - Services would implicitly couple through shared collections/schemas.
 *     A schema change in repo-service could silently break chat-service.
 *   - Contradicts the "clear ownership boundaries" goal from spec §9.2 —
 *     each service should own its models, migrations, and indexes.
 *
 * Why not a fully separate cluster per service:
 *   - Unnecessary operational cost for a solo/free-tier project — one
 *     Atlas free-tier cluster gives you 512MB shared across databases,
 *     and a cluster is the unit of billing, not the database.
 *   - Services still get real isolation: separate databases cannot
 *     query each other's collections directly, which is what actually
 *     enforces the boundary (not physical separation of hardware).
 *
 * Result: every service calls connectDb() with the SAME cluster URI but
 * ITS OWN dbName. Cross-service data needs go through that service's
 * REST API (or an event), never a direct cross-database query.
 * ──────────────────────────────────────────────────────────────────────
 */
export async function connectDb(options: ConnectDbOptions): Promise<Connection> {
  const { uri, dbName, serviceName, logger, maxPoolSize = 10 } = options;

  mongoose.set("strictQuery", true);

  const connection = mongoose.createConnection(uri, {
    dbName,
    maxPoolSize,
    serverSelectionTimeoutMS: 10_000,
  });

  connection.on("connected", () => {
    logger.info({ dbName, serviceName }, "MongoDB connected");
  });

  connection.on("error", (err) => {
    logger.error({ err, dbName, serviceName }, "MongoDB connection error");
  });

  connection.on("disconnected", () => {
    logger.warn({ dbName, serviceName }, "MongoDB disconnected");
  });

  const shutdown = async () => {
    await connection.close();
    logger.info({ dbName, serviceName }, "MongoDB connection closed gracefully");
  };
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);

  await connection.asPromise();
  return connection;
}
