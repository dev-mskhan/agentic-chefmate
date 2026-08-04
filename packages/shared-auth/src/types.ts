/**
 * The single source of truth for the shape of our access tokens.
 *
 * Both auth-service (signs them) and gateway (verifies them) import this type
 * from @platform/shared-auth, so the token shape can never silently drift
 * between the two.
 */
export type UserRole = "user" | "admin";

export interface AccessTokenPayload {
  /** userId — the Mongo ObjectId string of the User document. */
  sub: string;
  email: string;
  role: UserRole;
  /** The active Redis session this token belongs to (for revocation). */
  sessionId: string;
  /** Seconds since epoch, set by jose at sign time. */
  iat: number;
  /** Seconds since epoch, set by jose at sign time. */
  exp: number;
}

/**
 * The subset of the payload a caller provides when signing — iat/exp are
 * filled in by jose.
 */
export type AccessTokenClaims = Omit<AccessTokenPayload, "iat" | "exp">;
