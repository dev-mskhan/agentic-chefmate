import { createConfig, baseEnvSchema, loadEnv } from '@chefmate/config'
import { z } from 'zod'
import os from 'node:os'

loadEnv(__dirname)

const notifEnvSchema = baseEnvSchema.extend({
  PORT:             z.coerce.number().default(3006),
  INSTANCE_ID:      z.string().default(() => os.hostname()),
  MONGODB_URI:      z.string().url(),
  REDIS_URL:        z.string().url().default('redis://localhost:6379'),
  REDPANDA_BROKER:  z.string().default('localhost:9092'),
  USER_SERVICE_URL:  z.string().url().default('http://localhost:3002'),
  AUTH_SERVICE_URL:  z.string().url().default('http://localhost:3001'),
  INTERNAL_SECRET:   z.string().min(16).default('dev-internal-secret-32-characters!!'),

  // ── Gmail SMTP ──────────────────────────────────────────────────────────────
  SMTP_HOST:        z.string().default('smtp.gmail.com'),
  SMTP_PORT:        z.coerce.number().default(465),
  SMTP_SECURE:      z.coerce.boolean().default(true),
  SMTP_USER:        z.string().min(1),
  SMTP_PASS:        z.string().min(1),
  SMTP_FROM_EMAIL:  z.string().email(),
  SMTP_FROM_NAME:   z.string().default('ChefMate'),

  // ── Web Push ─────────────────────────────────────────────────────────────────
  VAPID_PUBLIC_KEY:  z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  VAPID_SUBJECT:     z.string().email().default('admin@chefmate.app'),

  APP_URL: z.string().url().default('http://localhost:3000'),

  // ── Alerting ──────────────────────────────────────────────────────────────────
  /** Slack Incoming Webhook URL. If absent, Slack alerts are silently skipped. */
  SLACK_WEBHOOK_URL:     z.string().url().optional(),
  /** PagerDuty Events API v2 routing key. If absent, PD alerts are skipped. */
  PAGERDUTY_ROUTING_KEY: z.string().optional(),
})

export type NotifConfig = z.infer<typeof notifEnvSchema>
export const config = createConfig(notifEnvSchema)
