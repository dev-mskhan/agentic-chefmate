import { OAuth2Client } from "google-auth-library";
import type { AuthEnv } from "../config/env.js";

export interface GoogleProfile {
  googleId: string;
  email: string;
  name: string;
  avatarUrl?: string;
}

export interface GoogleOAuthService {
  getConsentUrl(): string;
  exchangeCode(code: string): Promise<GoogleProfile>;
}

export function createGoogleOauthService(config: AuthEnv): GoogleOAuthService {
  const client = new OAuth2Client({
    clientId: config.GOOGLE_CLIENT_ID,
    clientSecret: config.GOOGLE_CLIENT_SECRET,
    redirectUri: config.GOOGLE_CALLBACK_URL,
  });

  return {
    getConsentUrl() {
      return client.generateAuthUrl({
        access_type: "offline",
        prompt: "consent",
        scope: ["openid", "email", "profile"],
      });
    },

    async exchangeCode(code) {
      const { tokens } = await client.getToken(code);
      client.setCredentials(tokens);
      if (!tokens.id_token) {
        throw new Error("Google did not return an id_token");
      }
      const ticket = await client.verifyIdToken({
        idToken: tokens.id_token,
        audience: config.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      if (!payload?.sub || !payload.email) {
        throw new Error("Google ID token payload is missing sub or email");
      }
      return {
        googleId: payload.sub,
        email: payload.email,
        name: payload.name ?? payload.email,
        avatarUrl: payload.picture ?? undefined,
      };
    },
  };
}
