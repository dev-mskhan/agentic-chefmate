import { builder } from "../builder.js";

export const SessionType = builder.objectRef<{
  sessionId: string;
  userId: string;
  refreshTokenHash: string;
  userAgent?: string;
  ip?: string;
  createdAt: number;
}>("Session");

SessionType.implement({
  fields: (t) => ({
    sessionId: t.exposeID("sessionId"),
    userAgent: t.field({
      type: "String",
      nullable: false,
      resolve: (parent) => parent.userAgent ?? "unknown",
    }),
    ip: t.field({
      type: "String",
      nullable: false,
      resolve: (parent) => parent.ip ?? "unknown",
    }),
    createdAt: t.exposeFloat("createdAt"),
  }),
});
