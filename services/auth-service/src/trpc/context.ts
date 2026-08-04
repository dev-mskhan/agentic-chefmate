import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { ACCESS_TOKEN_COOKIE, verifyAccessToken, type AccessTokenPayload } from "@platform/shared-auth";
import type { AuthContainer } from "../container.js";

export interface TrpcContext {
  /** Verified access-token payload, or null when no valid access token. */
  user: AccessTokenPayload | null;
  container: AuthContainer;
  ip?: string;
  userAgent?: string;
}

/**
 * Builds the tRPC context per request by verifying the signed access_token
 * cookie. Cookie-writing NEVER happens here (or in any procedure) — that is
 * the REST layer's job (§4.1).
 */
export function createTrpcContextFactory(
  container: AuthContainer,
  publicKeyPem: string,
): (opts: CreateExpressContextOptions) => Promise<TrpcContext> {
  return async ({ req }): Promise<TrpcContext> => {
    let user: AccessTokenPayload | null = null;
    const accessToken = req.signedCookies?.[ACCESS_TOKEN_COOKIE];

    if (accessToken && typeof accessToken === "string") {
      try {
        user = await verifyAccessToken(accessToken, publicKeyPem);
      } catch {
        user = null;
      }
    }

    return {
      user,
      container,
      ip: req.ip ?? req.socket.remoteAddress,
      userAgent: req.get("user-agent"),
    };
  };
}
