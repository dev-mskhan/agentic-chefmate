import { createConfig, baseEnvSchema, loadEnv } from '@chefmate/config'
import { z } from 'zod'

loadEnv(__dirname)

const mediaEnvSchema = baseEnvSchema.extend({
  PORT: z.coerce.number().default(3004),
  MONGODB_URI: z.string().url(),
  REDPANDA_BROKER: z.string().default('localhost:9092'),
  STORAGE_PROVIDER: z.enum(['minio', 'r2', 's3']).default('minio'),
  MINIO_ENDPOINT: z.string().url().default('http://localhost:9000'),
  MINIO_PORT: z.coerce.number().default(9000),
  MINIO_ACCESS_KEY: z.string().min(1),
  MINIO_SECRET_KEY: z.string().min(1),
  MINIO_BUCKET: z.string().min(1),
  MINIO_USE_SSL: z.coerce.boolean().default(false),
  SIGNED_URL_UPLOAD_EXPIRY: z.coerce.number().default(900),
  SIGNED_URL_DOWNLOAD_EXPIRY: z.coerce.number().default(3600),
})

export type MediaConfig = z.infer<typeof mediaEnvSchema>

export const config = createConfig(mediaEnvSchema)
