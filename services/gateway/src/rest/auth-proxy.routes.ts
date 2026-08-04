import { Router } from "express";

/**
 * Proxies Google OAuth redirect endpoints to auth-service (§4.6).
 * The gateway is the only entry point for the browser; auth-service
 * is never directly exposed to the client.
 */
export function createAuthProxyRoutes(authServiceUrl: string): Router {
  const router = Router();

  /** GET /api/v1/auth/google — redirect to auth-service's Google consent URL */
  router.get("/google", async (_req, res) => {
    try {
      const resp = await fetch(`${authServiceUrl}/api/v1/auth/google`, {
        redirect: "manual",
      });

      const location = resp.headers.get("location");
      if (location) {
        res.redirect(location);
      } else {
        res.status(resp.status);
      }
    } catch {
      res.status(502).json({ error: "Failed to reach auth service" });
    }
  });

  /** GET /api/v1/auth/google/callback — proxy the callback through to auth-service */
  router.get("/google/callback", async (req, res) => {
    try {
      const params = new URLSearchParams(req.query as Record<string, string>);
      const resp = await fetch(
        `${authServiceUrl}/api/v1/auth/google/callback?${params.toString()}`,
        {
          redirect: "manual",
        },
      );

      const location = resp.headers.get("location");
      const setCookies = resp.headers.getSetCookie?.() ?? [];

      for (const cookie of setCookies) {
        res.appendHeader("Set-Cookie", cookie);
      }

      if (location) {
        res.redirect(location);
      } else {
        res.status(resp.status);
      }
    } catch {
      res.status(502).json({ error: "Failed to reach auth service" });
    }
  });

  return router;
}
