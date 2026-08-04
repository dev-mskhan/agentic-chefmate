export const ACCESS_TOKEN_COOKIE = "access_token";
export const REFRESH_TOKEN_COOKIE = "refresh_token";

export const ACCESS_TOKEN_MAX_AGE_MS = 15 * 60 * 1000;
export const REFRESH_TOKEN_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export interface AuthCookieOptions {
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax";
  signed: boolean;
  path: string;
  maxAge: number;
}

/**
 * The cookie options every auth cookie is written with (§4.3). Passed straight
 * to res.cookie(). `signed: true` requires cookie-parser to be mounted with
 * COOKIE_SECRET, which both auth-service and gateway do.
 */
export function buildCookieOptions(
  maxAgeMs: number,
  isProduction = process.env.NODE_ENV === "production",
): AuthCookieOptions {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    signed: true,
    path: "/",
    maxAge: maxAgeMs,
  };
}
