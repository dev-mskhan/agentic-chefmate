import { Strategy as LocalStrategy } from 'passport-local'
import * as argon2 from 'argon2'
import { User } from '../models/user.model'
import { UnauthorizedError } from '@chefmate/errors'

/**
 * Passport local strategy — email + password authentication.
 * Uses argon2 for password verification.
 * Returns the User document on success, calls done(error) on failure.
 */
export const localStrategy = new LocalStrategy(
  { usernameField: 'email', passwordField: 'password' },
  async (email: string, password: string, done) => {
    try {
      const user = await User.findOne({ email: email.toLowerCase().trim() })

      if (!user || !user.passwordHash) {
        return done(null, false, { message: 'Invalid email or password' })
      }

      const isValid = await argon2.verify(user.passwordHash, password)
      if (!isValid) {
        return done(null, false, { message: 'Invalid email or password' })
      }

      return done(null, user)
    } catch (err) {
      return done(err)
    }
  },
)
