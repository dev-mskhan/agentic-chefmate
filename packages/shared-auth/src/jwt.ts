import { SignJWT, importPKCS8, importSPKI, jwtVerify } from "jose";
import type { AccessTokenClaims, AccessTokenPayload } from "./types.js";

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
export const REFRESH_TOKEN_TTL_DAYS = 30;

/**
 * Signs a fresh access token with the auth-service's RSA private key.
 *
 * Only auth-service holds the private key (JWT_PRIVATE_KEY). Every other
 * service that needs to verify tokens only ever sees the public key.
 * Uses RS256 — never a shared-secret HMAC.
 */
export async function signAccessToken(
  claims: AccessTokenClaims,
  privateKeyPem: string,
): Promise<string> {
  const privateKey = await importPKCS8(privateKeyPem, "RS256");
  return new SignJWT({
    email: claims.email,
    role: claims.role,
    sessionId: claims.sessionId,
  })
    .setProtectedHeader({ alg: "RS256" })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TOKEN_TTL_SECONDS}s`)
    .sign(privateKey);
}

/**
 * Verifies an access token's signature with the public key and validates that
 * every required claim is present and well-formed. Throws on any failure
 * (expired, bad signature, malformed payload) — callers treat that as "no
 * valid user".
 */
export async function verifyAccessToken(
  token: string,
  publicKeyPem: string,
): Promise<AccessTokenPayload> {
  const publicKey = await importSPKI(publicKeyPem, "RS256");
  const { payload } = await jwtVerify(token, publicKey, {
    algorithms: ["RS256"],
  });

  if (
    typeof payload.sub !== "string" ||
    payload.sub.length === 0 ||
    typeof payload.email !== "string" ||
    (payload.role !== "user" && payload.role !== "admin") ||
    typeof payload.sessionId !== "string" ||
    payload.sessionId.length === 0 ||
    typeof payload.iat !== "number" ||
    typeof payload.exp !== "number"
  ) {
    throw new Error("Access token payload is missing required claims");
  }

  return {
    sub: payload.sub,
    email: payload.email,
    role: payload.role,
    sessionId: payload.sessionId,
    iat: payload.iat,
    exp: payload.exp,
  };
}
