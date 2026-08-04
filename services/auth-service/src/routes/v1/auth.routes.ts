import { Router } from "express";
import { asyncHandler } from "@platform/shared-types";
import type { AuthController } from "../../controllers/auth.controller.js";

export function createAuthRouter(controller: AuthController): Router {
  const router = Router();
  router.get("/google", asyncHandler(controller.googleLogin));
  router.get("/google/callback", asyncHandler(controller.googleCallback));
  router.post("/refresh", asyncHandler(controller.refresh));
  router.post("/logout", asyncHandler(controller.logout));
  return router;
}
