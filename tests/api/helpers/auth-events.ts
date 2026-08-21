import { Kafka, type Consumer } from 'kafkajs'
import type { AuthEvent } from '@chefmate/event-contracts'

/**
 * Test-only Kafka consumer that captures auth.events emitted by auth-service.
 *
 * The raw one-time email-verification and password-reset tokens are never
 * persisted anywhere — they are only embedded in the `verifyUrl` / `resetUrl`
 * fields of `user.registered` / `user.password_reset_requested` events on the
 * `auth.events` topic. notification-service consumes this same topic to email
 * the links; we consume it here to obtain the tokens for the E2E tests.
 *
 * No mocks: this is a real Kafka consumer against the live Redpanda broker.
 */

const AUTH_EVENTS_TOPIC = 'auth.events'

export interface CapturedToken {
  token: string
  email: string
}

export class AuthEventsCapture {
  private kafka: Kafka
  private consumer: Consumer
  private groupId: string
  private verifyByMail = new Map<string, string[]>() // email -> raw tokens
  private resetByMail = new Map<string, string[]>()
  private connected = false

  constructor(broker = process.env['REDPANDA_BROKER'] ?? 'localhost:9092') {
    this.kafka = new Kafka({ clientId: 'api-tests-auth-capture', brokers: [broker] })
    // Unique group id per process so parallel runs don't steal each other's
    // messages and so we always read from the live tail.
    this.groupId = `api-tests-auth-capture-${process.pid}-${Date.now()}`
    this.consumer = this.kafka.consumer({
      groupId: this.groupId,
      sessionTimeout: 10000,
      rebalanceTimeout: 12000,
    })
  }

  async start(): Promise<void> {
    if (this.connected) return
    await this.consumer.connect()
    await this.consumer.subscribe({ topic: AUTH_EVENTS_TOPIC, fromBeginning: false })
    await this.consumer.run({
      eachMessage: async ({ message }) => {
        if (!message.value) return
        try {
          const event = JSON.parse(message.value.toString()) as AuthEvent
          this.handle(event)
        } catch {
          // Ignore malformed messages
        }
      },
    })
    this.connected = true
  }

  private handle(event: AuthEvent): void {
    if (event.type === 'user.registered' && event.provider === 'local') {
      const token = extractTokenFromUrl(event.verifyUrl)
      if (token) this.push(this.verifyByMail, event.email.toLowerCase(), token)
    } else if (event.type === 'user.password_reset_requested') {
      const token = extractTokenFromUrl(event.resetUrl)
      if (token) this.push(this.resetByMail, event.email.toLowerCase(), token)
    }
  }

  private push(map: Map<string, string[]>, email: string, token: string): void {
    const arr = map.get(email) ?? []
    arr.push(token)
    map.set(email, arr)
  }

  /**
   * Wait for an email-verification token for the given email, polling until
   * one arrives or the timeout elapses.
   */
  async waitForVerifyToken(email: string, timeoutMs = 15000): Promise<string> {
    return this.wait(this.verifyByMail, email, timeoutMs, 'email-verification token')
  }

  /** Wait for a password-reset token for the given email. */
  async waitForResetToken(email: string, timeoutMs = 15000): Promise<string> {
    return this.wait(this.resetByMail, email, timeoutMs, 'password-reset token')
  }

  private async wait(
    map: Map<string, string[]>,
    email: string,
    timeoutMs: number,
    label: string,
  ): Promise<string> {
    const key = email.toLowerCase()
    const deadline = Date.now() + timeoutMs
    while (Date.now() < deadline) {
      const arr = map.get(key)
      if (arr && arr.length > 0) return arr.shift()!
      await new Promise((r) => setTimeout(r, 100))
    }
    throw new Error(`Timed out waiting for ${label} for ${email}`)
  }

  async stop(): Promise<void> {
    if (!this.connected) return
    try {
      await this.consumer.disconnect()
    } catch {
      // Ignore
    }
    this.connected = false
  }
}

function extractTokenFromUrl(url: string): string | undefined {
  const idx = url.indexOf('token=')
  if (idx === -1) return undefined
  const rest = url.slice(idx + 'token='.length)
  const amp = rest.indexOf('&')
  return amp === -1 ? rest : rest.slice(0, amp)
}
