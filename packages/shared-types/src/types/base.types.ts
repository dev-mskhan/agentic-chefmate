import type { Types } from "mongoose";

/**
 * Fields present on every Mongoose document in the platform.
 * Every service's model interfaces should extend this instead of
 * redeclaring _id/timestamps, so cross-service references (e.g. a
 * Message referencing a userId that lives in a different service's DB)
 * stay type-consistent.
 */
export interface BaseDocument {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Standard shape for a paginated list request.
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
}

/**
 * Standard shape for a paginated list response.
 */
export interface PaginatedResult<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
