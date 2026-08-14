import { User, IUser } from '../models/user.model'

export interface GoogleProfile {
  id: string
  emails?: Array<{ value: string; verified: boolean }>
  displayName?: string
}

export interface UpsertGoogleUserResult {
  user: IUser
  isNewUser: boolean
}

/**
 * Industry-standard Google OAuth Account Linking:
 * 1. If user with same googleId exists -> Return user (isNewUser: false)
 * 2. If user with same email exists -> Link googleId & verify email (isNewUser: false)
 * 3. If user does not exist -> Create new user with googleId & verified email (isNewUser: true)
 */
export async function upsertGoogleUser(profile: GoogleProfile): Promise<UpsertGoogleUserResult> {
  const googleId = profile.id
  const email = profile.emails?.[0]?.value?.toLowerCase().trim()

  if (!email) {
    throw new Error('Google profile missing email')
  }

  // 1. Check if already linked by googleId
  let user = await User.findOne({ googleId })
  if (user) {
    return { user, isNewUser: false }
  }

  // 2. Check if email already exists (link accounts atomically)
  user = await User.findOneAndUpdate(
    { email },
    {
      $set: {
        googleId,
        emailVerified: true,
      },
    },
    { new: true },
  )

  if (user) {
    return { user, isNewUser: false }
  }

  // 3. Create new user
  user = await User.create({
    email,
    googleId,
    emailVerified: true,
    role: 'USER',
  })

  return { user, isNewUser: true }
}
