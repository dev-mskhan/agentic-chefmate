import type { IncomingMessage, ServerResponse } from "node:http";
import { verifyAccessToken, ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@platform/shared-auth";
import type { TRPCClient } from "@trpc/client";
import type { AppRouter } from "@platform/auth-service";
import type { Logger } from "@platform/logger";
import { callAuthRefresh } from "../clients/auth-rest-client.js";

export interface GraphQLContext {
  user: { sub: string; email: string; role: string } | null;
  authClient: TRPCClient<AppRouter>;
  logger: Logger;
  ip: string | undefined;
  userAgent: string | undefined;
  setCookies: string[];
}

function getCookie(req: IncomingMessage, name: string): string | undefined {
  const raw = req.headers.cookie ?? "";
  const match = raw.split(";").find((c) => c.trim().startsWith(`${name}=`));
  return match?.split("=").slice(1).join("=")?.trim();
}

function getClientIp(req: IncomingMessage): string {
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string") return fwd.split(",")[0]!.trim();
  return req.socket?.remoteAddress ?? "127.0.0.1";
}

export async function buildContext(
  req: IncomingMessage,
  res: ServerResponse,
  authClient: TRPCClient<AppRouter>,
  jwtPublicKey: string,
  authServiceUrl: string,
  logger: Logger,
): Promise<GraphQLContext> {
  const ip = getClientIp(req);
  const userAgent = req.headers["user-agent"];
  const setCookies: string[] = [];

  // 1. Try verifying the access token cookie directly.
  const accessToken = getCookie(req, ACCESS_TOKEN_COOKIE);
  if (accessToken) {
    try {
      const payload = await verifyAccessToken(accessToken, jwtPublicKey);
      return { user: payload, authClient, logger, ip, userAgent, setCookies };
    } catch {
      // access token invalid/expired — fall through to refresh attempt
    }
  }

  // 2. Access token missing or invalid → try refresh token.
  const refreshToken = getCookie(req, REFRESH_TOKEN_COOKIE);
  if (!refreshToken) {
    return { user: null, authClient, logger, ip, userAgent, setCookies };
  }

  // 3. Refresh token present → call auth-service REST /refresh (§4.8).
  const refreshResult = await callAuthRefresh(
    authServiceUrl,
    {
      cookie: req.headers.cookie,
      "x-forwarded-for": ip,
    },
    logger,
  );

  // 4. Relay Set-Cookie headers from auth-service onto gateway response.
  if (refreshResult.setCookieHeaders.length > 0) {
    for (const header of refreshResult.setCookieHeaders) {
      res.setHeader("Set-Cookie", [
        ...(Array.isArray(res.getHeader("Set-Cookie"))
          ? (res.getHeader("Set-Cookie") as string[])
          : res.getHeader("Set-Cookie")
            ? [res.getHeader("Set-Cookie") as string]
            : []),
        header,
      ]);
      setCookies.push(header);
    }
  }

  // 5. If refresh succeeded, verify the new access token from the response cookies.
  if (refreshResult.ok) {
    // The new access token is in the Set-Cookie headers from auth-service.
    // Parse it from the set-cookie headers to verify.
    const newAccessCookie = refreshResult.setCookieHeaders.find((h) =>
      h.startsWith(`${ACCESS_TOKEN_COOKIE}=`),
    );
    if (newAccessCookie) {
      const tokenValue = newAccessCookie.split(";")[0]!.split("=").slice(1).join("=");
      try {
        const payload = await verifyAccessToken(tokenValue, jwtPublicKey);
        return { user: payload, authClient, logger, ip, userAgent, setCookies };
      } catch {
        // new access token from refresh is somehow invalid — treat as unauthenticated
      }
    }
  }

  return { user: null, authClient, logger, ip, userAgent, setCookies };
}
