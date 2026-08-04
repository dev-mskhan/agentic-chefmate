import { UnauthorizedError } from "@platform/shared-types";
import { builder } from "../builder.js";
import { UserType } from "../types/user.type.js";
import { SessionType } from "../types/session.type.js";

builder.queryField("me", (t) =>
  t.field({
    type: UserType,
    nullable: true,
    resolve: async (_parent, _args, ctx) => {
      if (!ctx.user) {
        return null;
      }
      const result = await ctx.authClient.auth.getCurrentUser.query();
      return result;
    },
  }),
);

builder.queryField("sessions", (t) =>
  t.field({
    type: [SessionType],
    nullable: false,
    resolve: async (_parent, _args, ctx) => {
      if (!ctx.user) {
        throw new UnauthorizedError("Authentication required");
      }
      return ctx.authClient.auth.listSessions.query();
    },
  }),
);
