import { builder } from "../builder.js";

export const UserType = builder.objectRef<{
  id: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
  role: string;
}>("User");

UserType.implement({
  fields: (t) => ({
    id: t.exposeID("id"),
    email: t.exposeString("email"),
    name: t.exposeString("name"),
    avatarUrl: t.field({
      type: "String",
      nullable: true,
      resolve: (parent) => parent.avatarUrl ?? null,
    }),
    role: t.exposeString("role"),
  }),
});
