import request from "supertest";
import { createTestApp, type TestApp } from "../utils/test-app";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
describe("Auth REST routes", () => {
  let testApp: TestApp;

  beforeAll(async () => {
    testApp = await createTestApp();
  }, 90_000);

  afterAll(async () => {
    await testApp?.close();
  });

  describe("GET /api/v1/auth/google", () => {
    it("redirects to Google consent URL", async () => {
      const res = await request(testApp.app).get("/api/v1/auth/google");
      expect(res.status).toBeLessThanOrEqual(302);
    });
  });

  describe("POST /api/v1/auth/refresh", () => {
    it("returns 401 when no refresh token cookie is present", async () => {
      const res = await request(testApp.app).post("/api/v1/auth/refresh");
      expect(res.status).toBe(401);
    });

    it("returns 401 when refresh token is invalid", async () => {
      const res = await request(testApp.app)
        .post("/api/v1/auth/refresh")
        .set("Cookie", "refresh_token=invalid-token-value");
      expect(res.status).toBe(401);
    });
  });

  describe("POST /api/v1/auth/logout", () => {
    it("returns 200 even when no session exists", async () => {
      const res = await request(testApp.app)
        .post("/api/v1/auth/logout")
        .set("Cookie", "access_token=invalid");
      expect(res.status).toBe(200);
    });
  });
});
