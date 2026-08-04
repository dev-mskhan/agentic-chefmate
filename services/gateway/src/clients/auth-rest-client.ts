import type { Logger } from "@platform/logger";

export interface RefreshResult {
  ok: boolean;
  status: number;
  setCookieHeaders: string[];
  body: unknown;
}

/**
 * Thin fetch wrapper for server-to-server calls to auth-service's
 * REST POST /api/v1/auth/refresh endpoint. Forwards the original
 * client's Cookie and X-Forwarded-For headers so auth-service
 * can read + rotate the refresh token and rate-limit by real client IP.
 */
export async function callAuthRefresh(
  authServiceUrl: string,
  incomingHeaders: { cookie?: string; "x-forwarded-for"?: string },
  logger: Logger,
): Promise<RefreshResult> {
  try {
    const resp = await fetch(`${authServiceUrl}/api/v1/auth/refresh`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(incomingHeaders.cookie ? { cookie: incomingHeaders.cookie } : {}),
        ...(incomingHeaders["x-forwarded-for"]
          ? { "x-forwarded-for": incomingHeaders["x-forwarded-for"] }
          : {}),
      },
    });

    const setCookieHeaders = resp.headers.getSetCookie?.() ?? [];
    let body: unknown;
    try {
      body = await resp.json();
    } catch {
      body = null;
    }

    return {
      ok: resp.ok,
      status: resp.status,
      setCookieHeaders,
      body,
    };
  } catch (err) {
    logger.error({ err }, "Failed to reach auth-service /refresh");
    return { ok: false, status: 502, setCookieHeaders: [], body: null };
  }
}
