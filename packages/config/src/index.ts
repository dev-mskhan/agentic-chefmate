import { z, ZodSchema } from 'zod'

/**
 * Creates a validated config object from process.env using the provided Zod schema.
 * Throws an error at boot time if any required env var is missing or invalid.
 */
export function createConfig<T>(schema: ZodSchema<T>): T {
  const result = schema.safeParse(process.env)
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  ${i.path.join('.')}: ${i.message}`)
      .join('\n')
    throw new Error(`Invalid environment variables:\n${issues}`)
  }
  return result.data
}

/**
 * Base env schema shared by all services.
 * Services extend this with their own service-specific vars.
 */
export const baseEnvSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace'])
    .default('info'),
  PORT: z.coerce.number().int().positive().default(3000),
})

export type BaseEnv = z.infer<typeof baseEnvSchema>
