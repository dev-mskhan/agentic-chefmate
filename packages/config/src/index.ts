import * as dotenv from 'dotenv'
import * as path from 'path'
import { z, ZodSchema } from 'zod'

/**
 * Load environment variables in priority order:
 *   1. Service-level .env  (service/auth-service/.env)
 *   2. Root .env           (monorepo root .env) — only fills gaps, never overwrites
 *
 * dotenv.config() does NOT override existing env vars by default, so calling
 * root after service means service values always win.
 *
 * Both calls are relative to the directory passed in (default: process.cwd()).
 * Services call loadEnv(__dirname) from their src/ folder so the path is stable
 * regardless of which directory pnpm/turbo launches from.
 */
export function loadEnv(serviceDir: string): void {
  // serviceDir is typically the service's src/ directory e.g. services/auth-service/src
  // Service .env lives one level up: services/auth-service/.env
  const serviceEnv = path.resolve(serviceDir, '..', '.env')
  // Root .env lives at monorepo root — walk up from serviceDir past src/ service/ services/ to root
  const rootEnv = path.resolve(serviceDir, '..', '..', '..', '.env')

  // Load service-specific first (takes priority)
  dotenv.config({ path: serviceEnv })
  // Load root second — dotenv never overwrites already-set vars
  dotenv.config({ path: rootEnv })
}

/**
 * Creates a validated config object from process.env using the provided Zod schema.
 * Throws at boot time if any required env var is missing or invalid.
 *
 * Automatically converts literal \n sequences to real newlines (for PEM keys in .env).
 */
export function createConfig<T>(schema: ZodSchema<T>): T {
  const env: Record<string, string | undefined> = {}
  for (const [key, value] of Object.entries(process.env)) {
    env[key] = typeof value === 'string' ? value.replace(/\\n/g, '\n') : value
  }

  const result = schema.safeParse(env)
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  ${i.path.join('.')}: ${i.message}`)
      .join('\n')
    throw new Error(`Invalid environment variables:\n${issues}`)
  }
  return result.data
}

export const baseEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  PORT: z.coerce.number().int().positive().default(3000),
})

export type BaseEnv = z.infer<typeof baseEnvSchema>
