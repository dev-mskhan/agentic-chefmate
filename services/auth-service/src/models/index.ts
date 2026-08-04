import type { Connection } from "mongoose";
import { createAuditLogModel } from "./audit-log.model.js";
import { createUserModel } from "./user.model.js";

export type { AuditLogDoc, AuthAuditEventType } from "./audit-log.model.js";
export type { UserDoc, UserRole } from "./user.model.js";

let userModel: ReturnType<typeof createUserModel> | null = null;
let auditLogModel: ReturnType<typeof createAuditLogModel> | null = null;

/**
 * Models are bound to a per-service Mongoose Connection (database-per-service
 * pattern). server.ts and test-app.ts call this once with their connection;
 * the getters throw if accessed before initialization.
 */
export function initModels(connection: Connection): void {
  userModel = createUserModel(connection);
  auditLogModel = createAuditLogModel(connection);
}

export function getUserModel(): ReturnType<typeof createUserModel> {
  if (!userModel) {
    throw new Error("Models not initialized — call initModels(connection) first");
  }
  return userModel;
}

export function getAuditLogModel(): ReturnType<typeof createAuditLogModel> {
  if (!auditLogModel) {
    throw new Error("Models not initialized — call initModels(connection) first");
  }
  return auditLogModel;
}
