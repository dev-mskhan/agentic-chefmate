import { UnauthorizedError } from "@platform/shared-types";
import { builder } from "../builder.js";

builder.mutationField("revokeSession", (t) =>
  t.field({
    type: "Boolean",
    nullable: false,
    args: {
      sessionId: t.arg.id({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      if (!ctx.user) {
        throw new UnauthorizedError("Authentication required");
      }
      return ctx.authClient.auth.revokeSession.mutate({
        sessionId: args.sessionId as string,
      });
    },
  }),
);
