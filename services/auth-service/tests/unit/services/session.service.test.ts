import { hashRefreshToken } from "../../../src/services/session.service";

describe("hashRefreshToken", () => {
  it("produces a consistent SHA-256 hex digest", () => {
    const token = "abc123";
    const hash = hashRefreshToken(token);
    expect(hash).toBe(hashRefreshToken(token));
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("produces different hashes for different tokens", () => {
    expect(hashRefreshToken("token-a")).not.toBe(hashRefreshToken("token-b"));
  });
});
