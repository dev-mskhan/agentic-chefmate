import mongoose, { Schema, Document } from 'mongoose'

export const ConnectAccountStatusValues = ['PENDING', 'ONBOARDING', 'ACTIVE', 'RESTRICTED', 'DISABLED'] as const
export type ConnectAccountStatus = typeof ConnectAccountStatusValues[number]

export interface IConnectAccount extends Document {
  chefId:           string
  stripeAccountId:  string
  status:           ConnectAccountStatus
  chargesEnabled:   boolean
  payoutsEnabled:   boolean
  detailsSubmitted: boolean
  requirements:     Record<string, unknown>
  createdAt:        Date
  updatedAt:        Date
}

const connectAccountSchema = new Schema<IConnectAccount>(
  {
    chefId:           { type: String, required: true, unique: true },
    stripeAccountId:  { type: String, required: true, unique: true },
    status:           { type: String, enum: ConnectAccountStatusValues, default: 'PENDING' },
    chargesEnabled:   { type: Boolean, default: false },
    payoutsEnabled:   { type: Boolean, default: false },
    detailsSubmitted: { type: Boolean, default: false },
    requirements:     { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
)

connectAccountSchema.index({ chefId: 1 }, { unique: true })
connectAccountSchema.index({ stripeAccountId: 1 }, { unique: true })

export const ConnectAccount = mongoose.model<IConnectAccount>('ConnectAccount', connectAccountSchema, 'connectaccounts')
