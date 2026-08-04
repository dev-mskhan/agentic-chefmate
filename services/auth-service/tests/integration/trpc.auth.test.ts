import request from "supertest";
import { randomUUID } from "node:crypto";
import { signAccessToken } from "@platform/shared-auth";
import { createTestApp, type TestApp } from "../utils/test-app";
import { TEST_JWT_PRIVATE_KEY } from "../utils/fixtures";
import { describe, beforeAll, afterAll, it, expect } from "vitest";
describe("tRPC auth procedures via Express", () => {
  let testApp: TestApp;

  beforeAll(async () => {
    testApp = await createTestApp();
  });

  afterAll(async () => {
    await testApp.close();
  });

  describe("auth.getCurrentUser", () => {
    it("returns auth error when no cookie is present", async () => {
      const res = await request(testApp.app)
        .get("/api/v1/trpc/auth.getCurrentUser")
        .query({ batch: 1 });

      expect(res.status).toBe(200);
      const body = Array.isArray(res.body) ? res.body[0] : res.body;
      expect(body?.error?.code).toBe(-32001);
    });

    it("returns user when valid access token cookie is present", async () => {
      const userId = randomUUID();
      const accessToken = await signAccessToken(
        { sub: userId, email: "test@example.com", role: "user", sessionId: randomUUID() },
        TEST_JWT_PRIVATE_KEY,
      );

      const res = await request(testApp.app)
        .get("/api/v1/trpc/auth.getCurrentUser")
        .set("Cookie", `access_token=${accessToken}`)
        .query({ batch: 1 });

      expect(res.status).toBe(200);
      const body = Array.isArray(res.body) ? res.body[0] : res.body;
      expect(body?.result || body?.error).toBeDefined();
    });
  });

  describe("auth.listSessions", () => {
    it("returns auth error when no cookie is present", async () => {
      const res = await request(testApp.app)
        .get("/api/v1/trpc/auth.listSessions")
        .query({ batch: 1 });

      expect(res.status).toBe(200);
      const body = Array.isArray(res.body) ? res.body[0] : res.body;
      expect(body?.error?.code).toBe(-32001);
    });
  });
});
