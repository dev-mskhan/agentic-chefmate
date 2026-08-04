import { UnauthorizedError } from "@platform/shared-types";
import type { AuthContainer } from "../../container.js";
import { revokeSessionInputSchema } from "../../validators/auth.validators.js";
import { protectedProcedure, router } from "../trpc.js";

export function createAuthRouter(_container: AuthContainer) {
  return router({
    /** Returns the current user for the verified access token (§4.1). */
    getCurrentUser: protectedProcedure.query(async ({ ctx }) => {
      const user = await ctx.container.userService.findById(ctx.user!.sub);
      if (!user) {
        throw new UnauthorizedError("User no longer exists");
      }
      return user;
    }),

    /** Lists this user's active sessions (device/IP/createdAt) from Redis. */
    listSessions: protectedProcedure.query(async ({ ctx }) => {
      return ctx.container.sessionService.listByUserId(ctx.user!.sub);
    }),

    /** Revokes one specific session by id. No cookie-writing here. */
    revokeSession: protectedProcedure
      .input(revokeSessionInputSchema)
      .mutation(async ({ ctx, input }) => {
        await ctx.container.sessionService.revoke(input.sessionId, ctx.user!.sub);
        await ctx.container.pubsubService.publish({
          type: "session.revoked",
          userId: ctx.user!.sub,
          sessionId: input.sessionId,
          timestamp: Date.now(),
        });
        await ctx.container.auditLogProducer.publish({
          userId: ctx.user!.sub,
          eventType: "session.revoked",
          ip: ctx.ip,
          userAgent: ctx.userAgent,
          timestamp: Date.now(),
        });
        return true;
      }),
  });
}

export type AuthRouter = ReturnType<typeof createAuthRouter>;
