import RedisMock from "ioredis-mock";
import { signAccessToken, verifyAccessToken } from "@platform/shared-auth";
import { createSessionService } from "../../../src/services/session.service";
import { createTokenService } from "../../../src/services/token.service";
import { randomUUID } from "node:crypto";
import { TEST_JWT_PRIVATE_KEY, TEST_JWT_PUBLIC_KEY } from "../../utils/fixtures";

const mockLogger = {
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
  trace: () => {},
  fatal: () => {},
  child: () => mockLogger,
} as any;

describe("TokenService", () => {
  let redis: any;
  let sessionService: ReturnType<typeof createSessionService>;
  let tokenService: ReturnType<typeof createTokenService>;

  beforeEach(() => {
    redis = new RedisMock() as any;
    sessionService = createSessionService(redis, mockLogger);
    tokenService = createTokenService({
      redis,
      sessionService,
      jwtPrivateKey: TEST_JWT_PRIVATE_KEY,
      getUserClaims: async () => ({
        sub: randomUUID(),
        email: "test@example.com",
        role: "user",
      }),
    });
  });

  describe("issueTokenPair", () => {
    it("returns access token, refresh token, and session id", async () => {
      const result = await tokenService.issueTokenPair(
        { sub: randomUUID(), email: "test@example.com", role: "user" },
        { userAgent: "test-agent", ip: "127.0.0.1" },
      );

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.sessionId).toBeDefined();
      expect(typeof result.accessToken).toBe("string");
      expect(typeof result.refreshToken).toBe("string");
    });

    it("access token is verifiable with the public key", async () => {
      const claims = { sub: randomUUID(), email: "test@example.com", role: "user" };
      const result = await tokenService.issueTokenPair(claims, {});

      const payload = await verifyAccessToken(result.accessToken, TEST_JWT_PUBLIC_KEY);
      expect(payload.sub).toBe(claims.sub);
      expect(payload.email).toBe(claims.email);
      expect(payload.sessionId).toBe(result.sessionId);
    });

    it("session is stored in Redis", async () => {
      const result = await tokenService.issueTokenPair(
        { sub: randomUUID(), email: "test@example.com", role: "user" },
        {},
      );

      const session = await sessionService.findBySessionId(result.sessionId);
      expect(session).not.toBeNull();
      expect(session!.userId).toBeDefined();
    });
  });

  describe("rotateRefreshToken", () => {
    it("issues a new token pair on valid rotation", async () => {
      const userId = randomUUID();
      const result = await tokenService.issueTokenPair(
        { sub: userId, email: "test@example.com", role: "user" },
        { userAgent: "test-agent" },
      );

      const rotated = await tokenService.rotateRefreshToken(result.refreshToken, {
        userAgent: "new-agent",
      });

      expect(rotated.accessToken).toBeDefined();
      expect(rotated.refreshToken).toBeDefined();
      expect(rotated.sessionId).toBe(result.sessionId);
      expect(rotated.userId).toBe(userId);
      expect(rotated.refreshToken).not.toBe(result.refreshToken);
    });

    it("new access token is valid", async () => {
      const result = await tokenService.issueTokenPair(
        { sub: randomUUID(), email: "test@example.com", role: "user" },
        {},
      );

      const rotated = await tokenService.rotateRefreshToken(result.refreshToken, {});
      const payload = await verifyAccessToken(rotated.accessToken, TEST_JWT_PUBLIC_KEY);
      expect(payload.sessionId).toBe(result.sessionId);
    });

    it("old refresh token is invalidated after rotation", async () => {
      const result = await tokenService.issueTokenPair(
        { sub: randomUUID(), email: "test@example.com", role: "user" },
        {},
      );

      await tokenService.rotateRefreshToken(result.refreshToken, {});

      await expect(
        tokenService.rotateRefreshToken(result.refreshToken, {}),
      ).rejects.toThrow("Invalid refresh token");
    });

    it("throws on invalid refresh token", async () => {
      await expect(
        tokenService.rotateRefreshToken("nonexistent-token", {}),
      ).rejects.toThrow("Invalid refresh token");
    });
  });
});
