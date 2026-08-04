import type { Connection, Model } from "mongoose";
import { Schema } from "mongoose";
import type { BaseDocument } from "@platform/shared-types";

export type UserRole = "user" | "admin";

export interface UserDoc extends BaseDocument {
  googleId: string;
  email: string;
  name: string;
  avatarUrl?: string;
  role: UserRole;
}

const userSchema = new Schema<UserDoc>(
  {
    googleId: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    avatarUrl: { type: String },
    role: { type: String, enum: ["user", "admin"], default: "user" },
  },
  { timestamps: true },
);

export function createUserModel(connection: Connection): Model<UserDoc> {
  return connection.model<UserDoc>("User", userSchema);
}
