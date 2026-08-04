import type { Logger } from "@platform/logger";
import { getUserModel, type UserDoc, type UserRole } from "../models/index.js";
import type { UserProfileCache } from "./cache.service.js";
import type { GoogleProfile } from "./google-oauth.service.js";

export interface UserRecord {
  id: string;
  googleId: string;
  email: string;
  name: string;
  avatarUrl?: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export interface WelcomeEmailJobPayload {
  userId: string;
  email: string;
  name: string;
}

export interface WelcomeEmailProducer {
  publish(payload: WelcomeEmailJobPayload): Promise<void>;
}

export interface UserService {
  findOrCreateFromGoogleProfile(
    profile: GoogleProfile,
  ): Promise<{ user: UserRecord; isNew: boolean }>;
  findById(userId: string): Promise<UserRecord | null>;
}

function toUserRecord(doc: UserDoc): UserRecord {
  return {
    id: doc._id.toString(),
    googleId: doc.googleId,
    email: doc.email,
    name: doc.name,
    avatarUrl: doc.avatarUrl,
    role: doc.role,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export function createUserService(deps: {
  cache: UserProfileCache;
  welcomeEmailProducer?: WelcomeEmailProducer;
  logger: Logger;
}): UserService {
  return {
    async findOrCreateFromGoogleProfile(profile) {
      const User = getUserModel();
      let user = await User.findOne({ googleId: profile.googleId });

      if (!user) {
        user = await User.create({
          googleId: profile.googleId,
          email: profile.email,
          name: profile.name,
          avatarUrl: profile.avatarUrl,
        });
        // First login only — never re-enqueued on subsequent logins. Durable
        // via RabbitMQ so a welcome email is retried until delivered.
        if (deps.welcomeEmailProducer) {
          await deps.welcomeEmailProducer.publish({
            userId: user._id.toString(),
            email: user.email,
            name: user.name,
          });
        }
        return { user: toUserRecord(user), isNew: true };
      }

      // Google-side profile fields can change; refresh them.
      let changed = false;
      if (user.name !== profile.name) {
        user.name = profile.name;
        changed = true;
      }
      if (user.avatarUrl !== profile.avatarUrl) {
        user.avatarUrl = profile.avatarUrl;
        changed = true;
      }
      if (changed) {
        await user.save();
      }
      // Active invalidation — a cached profile is stale the moment the user
      // doc changes.
      await deps.cache.invalidateProfile(user._id.toString());

      return { user: toUserRecord(user), isNew: false };
    },

    async findById(userId) {
      const cached = await deps.cache.getProfile<UserRecord>(userId);
      if (cached) return cached;
      const user = await getUserModel().findById(userId);
      if (!user) return null;
      const record = toUserRecord(user);
      await deps.cache.setProfile(userId, record);
      return record;
    },
  };
}
