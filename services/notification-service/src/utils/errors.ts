/**
 * Thrown inside a BullMQ worker processor when an error is permanent —
 * i.e. retrying will never succeed (e.g. 4xx from provider, missing data,
 * bad configuration).
 *
 * Workers catch this and rethrow so BullMQ records the failure, but the
 * lifecycle listener checks `isPermanent` to skip straight to the DLQ
 * instead of waiting for all retry attempts to exhaust.
 */
export class PermanentNotificationError extends Error {
  readonly isPermanent = true as const

  constructor(message: string) {
    super(message)
    this.name = 'PermanentNotificationError'
    // Maintains proper prototype chain in transpiled JS
    Object.setPrototypeOf(this, PermanentNotificationError.prototype)
  }
}

/** Type guard — safe check without instanceof across module boundaries. */
export function isPermanentError(err: unknown): boolean {
  return (
    err instanceof PermanentNotificationError ||
    (typeof err === 'object' && err !== null && (err as { isPermanent?: unknown }).isPermanent === true)
  )
}
