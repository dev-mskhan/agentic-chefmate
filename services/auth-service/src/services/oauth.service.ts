import { User, IUser } from '../models/user.model'

export interface GoogleProfile {
  id: string
  emails?: Array<{ value: string; verified: boolean }>
  displayName?: string
}

/**
 * Upserts a user from a Google OAuth profile.
 * - If a user with the same googleId exists: return them
 * - If a user with the same email exists: link the googleId to their account
 * - Otherwise: create a new user
 */
export async function upsertGoogleUser(profile: GoogleProfile): Promise<IUser> {
  const googleId = profile.id
  const email = profile.emails?.[0]?.value?.toLowerCase()

  if (!email) {
    throw new Error('Google profile missing email')
  }

  // Check if already linked by googleId
  let user = await User.findOne({ googleId })
  if (user) return user

  // Check if email already exists (link accounts)
  user = await User.findOne({ email })
  if (user) {
    user.googleId = googleId
    user.emailVerified = true
    await user.save()
    return user
  }

  // Create new user
  user = await User.create({
    email,
    googleId,
    emailVerified: true,
    role: 'USER',
  })

  return user
}
