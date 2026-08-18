/**
 * QueryNormalizer — pure utility for deterministic search input normalization.
 * No database imports, no side effects.
 */

export const MAX_QUERY_LENGTH = 200

/**
 * Normalizes a raw search query string:
 * 1. Trims leading/trailing whitespace
 * 2. Converts to lowercase
 * 3. Collapses consecutive whitespace to a single space
 * 4. Truncates to MAX_QUERY_LENGTH characters
 *
 * Returns empty string if the result is empty after normalization.
 */
export function normalizeQuery(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .slice(0, MAX_QUERY_LENGTH)
}

/**
 * Returns true if the normalized query is empty (nothing to search).
 */
export function isEmptyQuery(normalized: string): boolean {
  return normalized.length === 0
}
