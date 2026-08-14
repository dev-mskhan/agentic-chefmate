import { config } from '../config'
import { createLogger } from '@chefmate/logger'

const logger = createLogger('notification-alert')

export interface AlertPayload {
  severity: 'warning' | 'critical'
  title: string
  message: string
  metadata?: Record<string, unknown>
}

/**
 * Sends an operational alert through all configured backends.
 *
 * Backends (controlled by env vars):
 *   - Logger (always)                         — surfaces in any log aggregator
 *   - Slack webhook  (SLACK_WEBHOOK_URL)       — DM or #oncall channel
 *   - PagerDuty      (PAGERDUTY_ROUTING_KEY)   — critical severity only
 */
export async function sendAlert(payload: AlertPayload): Promise<void> {
  // 1. Always log — guaranteed to work even if external services are down
  logger.error(
    { severity: payload.severity, metadata: payload.metadata },
    `[ALERT] ${payload.title} — ${payload.message}`,
  )

  const results = await Promise.allSettled([
    config.SLACK_WEBHOOK_URL ? sendSlackAlert(payload) : Promise.resolve(),
    config.PAGERDUTY_ROUTING_KEY && payload.severity === 'critical'
      ? sendPagerDutyAlert(payload)
      : Promise.resolve(),
  ])

  for (const r of results) {
    if (r.status === 'rejected') {
      // Don't throw — alerting itself failing must never crash the consumer
      logger.error({ err: r.reason }, 'Alert delivery failed')
    }
  }
}

// ── Slack ──────────────────────────────────────────────────────────────────────

async function sendSlackAlert(payload: AlertPayload): Promise<void> {
  const emoji = payload.severity === 'critical' ? '🔴' : '⚠️'

  const fields = Object.entries(payload.metadata ?? {}).map(([k, v]) => ({
    type: 'mrkdwn',
    text: `*${k}:* ${String(v)}`,
  }))

  const body = {
    text: `${emoji} *${payload.title}*`,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `${emoji} *${payload.title}*\n${payload.message}`,
        },
      },
      ...(fields.length > 0
        ? [{ type: 'section', fields }]
        : []),
    ],
  }

  const res = await fetch(config.SLACK_WEBHOOK_URL!, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    throw new Error(`Slack webhook returned ${res.status}`)
  }
}

// ── PagerDuty ─────────────────────────────────────────────────────────────────

async function sendPagerDutyAlert(payload: AlertPayload): Promise<void> {
  const body = {
    routing_key: config.PAGERDUTY_ROUTING_KEY!,
    event_action: 'trigger',
    payload: {
      summary:  payload.title,
      severity: payload.severity,
      source:   'notification-service',
      custom_details: payload.metadata,
    },
  }

  const res = await fetch('https://events.pagerduty.com/v2/enqueue', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    throw new Error(`PagerDuty API returned ${res.status}`)
  }
}
