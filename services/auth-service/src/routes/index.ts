import { Router } from "express";
import type { AuthController } from "../controllers/auth.controller.js";
import { createAuthRouter } from "./v1/auth.routes.js";

export function createV1Router(controller: AuthController): Router {
  const router = Router();
  router.use("/auth", createAuthRouter(controller));
  return router;
}
