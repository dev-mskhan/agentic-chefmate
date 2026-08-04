import { initTRPC } from "@trpc/server";
import { UnauthorizedError } from "@platform/shared-types";
import type { TrpcContext } from "./context.js";

const t = initTRPC.context<TrpcContext>().create();

export const router = t.router;
export const publicProcedure = t.procedure;
export const createCallerFactory = t.createCallerFactory;

/**
 * Rejects the call with a clean UnauthorizedError when ctx.user is null.
 * Every protected procedure starts from here.
 */
export const protectedProcedure = t.procedure.use((opts) => {
  if (!opts.ctx.user) {
    throw new UnauthorizedError("Authentication required");
  }
  return opts.next({ ctx: opts.ctx });
});
