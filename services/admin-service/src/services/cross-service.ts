import { createLogger } from '@chefmate/logger'

const logger = createLogger('admin-service:cross-service')

interface TrpcBatchResult { result?: { data?: unknown }; error?: { message?: string } }

/**
 * Calls an internal tRPC procedure on another service using the batch HTTP format.
 * Uses `x-internal-secret` header for service-to-service auth.
 */
export async function callInternalTrpc<T = unknown>(
  baseUrl:        string,
  procedure:      string,
  input:          unknown,
  internalSecret: string,
): Promise<T> {
  const url  = `${baseUrl}/trpc/${procedure}`
  const body = JSON.stringify({ '0': { json: input } })

  const res = await fetch(url, {
    method:  'POST',
    headers: {
      'Content-Type':      'application/json',
      'x-internal-secret': internalSecret,
    },
    body,
  })

  const text = await res.text()
  if (!res.ok) {
    logger.error({ procedure, status: res.status, body: text }, 'Cross-service call failed')
    throw new Error(`Cross-service call to ${procedure} failed with status ${res.status}: ${text}`)
  }

  try {
    const data = JSON.parse(text) as TrpcBatchResult[]
    if (data[0]?.error) throw new Error(data[0].error.message ?? 'Unknown tRPC error')
    return data[0]?.result?.data as T
  } catch (err) {
    logger.error({ procedure, err }, 'Failed to parse cross-service response')
    throw err
  }
}

export function callChefService<T = unknown>(
  procedure:      string,
  input:          unknown,
  internalSecret: string,
  chefServiceUrl: string,
): Promise<T> {
  return callInternalTrpc<T>(chefServiceUrl, procedure, input, internalSecret)
}

export function callReviewService<T = unknown>(
  procedure:        string,
  input:            unknown,
  internalSecret:   string,
  reviewServiceUrl: string,
): Promise<T> {
  return callInternalTrpc<T>(reviewServiceUrl, procedure, input, internalSecret)
}

export function callPayoutService<T = unknown>(
  procedure:       string,
  input:           unknown,
  internalSecret:  string,
  payoutServiceUrl: string,
): Promise<T> {
  return callInternalTrpc<T>(payoutServiceUrl, procedure, input, internalSecret)
}
