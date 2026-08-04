import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { createTestGatewayApp, type TestGatewayApp } from "../utils/test-app";

// Mock the tRPC client to avoid real network calls
vi.mock("../../../src/clients/auth-trpc-client", () => ({
  createAuthTrpcClient: () => ({
    auth: {
      getCurrentUser: {
        query: vi.fn().mockRejectedValue(new Error("No auth")),
      },
      listSessions: {
        query: vi.fn().mockResolvedValue([]),
      },
      revokeSession: {
        mutate: vi.fn().mockResolvedValue(true),
      },
    },
  }),
}));

describe("GraphQL gateway", () => {
  let gw: TestGatewayApp;

  beforeAll(async () => {
    gw = await createTestGatewayApp();
  });

  afterAll(async () => {
    await gw.close();
  });

  describe("POST /graphql", () => {
    it("returns me as null for unauthenticated request", async () => {
      const res = await request(gw.app)
        .post("/graphql")
        .set("Content-Type", "application/json")
        .send({ query: "{ me { id email name } }" });

      expect(res.status).toBe(200);
      expect(res.body.data.me).toBeNull();
    });

    it("does not crash on unauthenticated request", async () => {
      const res = await request(gw.app)
        .post("/graphql")
        .set("Content-Type", "application/json")
        .send({ query: "{ me { id } }" });

      expect(res.status).toBe(200);
      expect(res.body.errors).toBeUndefined();
    });
  });
});
