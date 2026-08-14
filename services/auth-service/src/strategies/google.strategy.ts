import { Strategy as GoogleStrategy, Profile } from 'passport-google-oauth20'
import { upsertGoogleUser } from '../services/oauth.service'
import { config } from '../config'

/**
 * Passport Google OAuth2.0 strategy.
 * On success, upserts the user and passes the result object { user, isNewUser } to done().
 */
export const googleStrategy = new GoogleStrategy(
  {
    clientID: config.GOOGLE_CLIENT_ID,
    clientSecret: config.GOOGLE_CLIENT_SECRET,
    callbackURL: config.GOOGLE_CALLBACK_URL,
    scope: ['email', 'profile'],
  },
  async (_accessToken: string, _refreshToken: string, profile: Profile, done) => {
    try {
      const result = await upsertGoogleUser({
        id: profile.id,
        emails: profile.emails as Array<{ value: string; verified: boolean }> | undefined,
        displayName: profile.displayName,
      })
      return done(null, result as unknown as Express.User)
    } catch (err) {
      return done(err as Error)
    }
  },
)
