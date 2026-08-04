import type { AuthContainer } from "../../container.js";
import { router } from "../trpc.js";
import { createAuthRouter } from "./auth.router.js";

export function createAppRouter(container: AuthContainer) {
  return router({
    auth: createAuthRouter(container),
  });
}

export type AppRouter = ReturnType<typeof createAppRouter>;
