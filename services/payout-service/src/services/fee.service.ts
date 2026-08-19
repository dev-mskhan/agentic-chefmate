export interface FeeCalculation {
  grossAmountCents: number
  platformFeeCents: number
  netAmountCents:   number
}

/**
 * Pure function — no side effects, no I/O.
 * Computes platform fee and chef net earnings using integer arithmetic.
 * @param grossAmountCents - Full order amount in integer cents (>= 0)
 * @param platformFeeBps   - Basis points (0–10000)
 */
export function calculateFee(grossAmountCents: number, platformFeeBps: number): FeeCalculation {
  const platformFeeCents = Math.round(grossAmountCents * platformFeeBps / 10000)
  const netAmountCents   = grossAmountCents - platformFeeCents
  return { grossAmountCents, platformFeeCents, netAmountCents }
}
