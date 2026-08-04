import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildContext } from "../../../src/graphql/context";
import { TEST_JWT_PRIVATE_KEY, TEST_JWT_PUBLIC_KEY } from "../../utils/fixtures";
import { signAccessToken } from "@platform/shared-auth";
import { randomUUID } from "node:crypto";

const mockLogger = {
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
  trace: () => {},
  fatal: () => {},
  child: () => mockLogger,
} as any;

function mockReq(cookies?: Record<string, string>) {
  const cookieStr = cookies
    ? Object.entries(cookies)
        .map(([k, v]) => `${k}=${v}`)
        .join("; ")
    : "";
  return {
    headers: cookieStr ? { cookie: cookieStr } : {},
    socket: { remoteAddress: "127.0.0.1" },
  } as any;
}

function mockRes() {
  const headers: Record<string, string[]> = {};
  return {
    setHeader: (name: string, value: string | string[]) => {
      headers[name] = Array.isArray(value) ? value : [value];
    },
    getHeader: (name: string) => headers[name],
    get headers() { return headers; },
  } as any;
}

const mockAuthClient = {} as any;

describe("GraphQL context builder", () => {
  it("sets user to null when no cookies are present", async () => {
    const ctx = await buildContext(
      mockReq(),
      mockRes(),
      mockAuthClient,
      TEST_JWT_PUBLIC_KEY,
      "http://localhost:3000",
      mockLogger,
    );
    expect(ctx.user).toBeNull();
  });

  it("sets user from a valid access token", async () => {
    const userId = randomUUID();
    const token = await signAccessToken(
      { sub: userId, email: "test@example.com", role: "user", sessionId: randomUUID() },
      TEST_JWT_PRIVATE_KEY,
    );
    const ctx = await buildContext(
      mockReq({ access_token: token }),
      mockRes(),
      mockAuthClient,
      TEST_JWT_PUBLIC_KEY,
      "http://localhost:3000",
      mockLogger,
    );
    expect(ctx.user).not.toBeNull();
    expect(ctx.user!.sub).toBe(userId);
  });

  it("sets user to null for an invalid access token", async () => {
    const ctx = await buildContext(
      mockReq({ access_token: "invalid-token" }),
      mockRes(),
      mockAuthClient,
      TEST_JWT_PUBLIC_KEY,
      "http://localhost:3000",
      mockLogger,
    );
    expect(ctx.user).toBeNull();
  });
});
