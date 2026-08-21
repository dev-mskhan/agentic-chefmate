import { createConfig, baseEnvSchema, loadEnv } from '@chefmate/config'
import { z } from 'zod'

loadEnv(__dirname)

const mediaEnvSchema = baseEnvSchema.extend({
  PORT: z.coerce.number().default(3004),
  MONGODB_URI: z.string().url(),
  REDPANDA_BROKER: z.string().default('localhost:9092'),
  STORAGE_PROVIDER: z.enum(['minio', 'r2', 's3']).default('minio'),

  // ─── MinIO (local dev) ────────────────────────────────────────────────────
  MINIO_ENDPOINT: z.string().url().default('http://localhost:9000'),
  MINIO_PORT: z.coerce.number().default(9000),
  MINIO_ACCESS_KEY: z.string().default(''),
  MINIO_SECRET_KEY: z.string().default(''),
  MINIO_BUCKET: z.string().default('chefmate-media'),
  MINIO_USE_SSL: z.coerce.boolean().default(false),

  // ─── Cloudflare R2 (production) ───────────────────────────────────────────
  // Endpoint format: https://<account-id>.r2.cloudflarestorage.com
  R2_ENDPOINT: z.string().url().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET: z.string().optional(),

  // ─── AWS S3 (alternative production) ─────────────────────────────────────
  AWS_REGION: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_S3_BUCKET: z.string().optional(),

  // ─── Signed URL expiry ────────────────────────────────────────────────────
  SIGNED_URL_UPLOAD_EXPIRY: z.coerce.number().default(900),
  SIGNED_URL_DOWNLOAD_EXPIRY: z.coerce.number().default(3600),

  // ─── Internal secret for service-to-service calls ──────────────────────────
  INTERNAL_SECRET: z.string().min(16).default('dev-internal-secret-32-characters!!'),
})

export type MediaConfig = z.infer<typeof mediaEnvSchema>

export const config = createConfig(mediaEnvSchema)
