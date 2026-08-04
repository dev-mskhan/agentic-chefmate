import "dotenv/config";
import { z, type ZodTypeAny, type infer as ZodInfer } from "zod";

/**
 * Fields every service needs, regardless of what else it does.
 * Individual services extend this with their own required vars
 * (e.g. GITHUB_TOKEN for repo-service, QDRANT_URL for indexing-service,
 * JWT_SECRET for the gateway) rather than redeclaring these.
 *
 * dotenv/config runs on import above: locally it loads .env if present.
 * In Docker/CI, env vars are injected directly by docker-compose / the CI
 * runner and no .env file exists — dotenv silently no-ops in that case
 * and never overrides a variable that's already set in process.env.
 */
export const baseEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  MONGODB_DB_NAME: z.string().min(1, "MONGODB_DB_NAME is required"),
  REDIS_URL: z.string().min(1, "REDIS_URL is required"),
});

export type BaseEnv = ZodInfer<typeof baseEnvSchema>;

/**
 * Validates process.env against a schema and returns a fully typed,
 * fully validated config object. Call this once at service startup
 * (top of src/index.ts / src/server.ts) and pass the result down —
 * never read process.env directly elsewhere in a service.
 *
 * Fails fast with a readable message listing every missing/invalid var,
 * instead of the service starting and failing confusingly later.
 */
export function loadEnv<T extends ZodTypeAny>(schema: T): ZodInfer<T> {
  const result = schema.safeParse(process.env);

  if (!result.success) {
    const formatted = result.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    // eslint-disable-next-line no-console -- logger isn't guaranteed to exist yet at this point
    console.error(`Invalid environment configuration:\n${formatted}`);
    process.exit(1);
  }

  return result.data;
}
