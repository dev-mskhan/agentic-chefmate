import mongoose, { Schema, Document, Model } from 'mongoose'

export type Role = 'USER' | 'CHEF' | 'ADMIN'

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId
  email: string
  passwordHash?: string
  role: Role
  emailVerified: boolean
  googleId?: string
  createdAt: Date
  updatedAt: Date
}

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String },
    role: {
      type: String,
      enum: ['USER', 'CHEF', 'ADMIN'],
      default: 'USER',
    },
    emailVerified: { type: Boolean, default: false },
    googleId: { type: String, sparse: true, unique: true },
  },
  { timestamps: true },
)

export const User: Model<IUser> = mongoose.model<IUser>('User', UserSchema)
