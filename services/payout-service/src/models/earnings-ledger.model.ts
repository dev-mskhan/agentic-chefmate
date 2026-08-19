import mongoose, { Schema, Document } from 'mongoose'

export const LedgerEntryTypeValues    = ['CREDIT', 'DEBIT', 'HOLD', 'HOLD_RELEASE'] as const
export const LedgerEntryStatusValues  = ['PENDING', 'AVAILABLE', 'TRANSFERRED', 'REFUNDED'] as const
export type LedgerEntryType   = typeof LedgerEntryTypeValues[number]
export type LedgerEntryStatus = typeof LedgerEntryStatusValues[number]

export interface IEarningsLedger extends Document {
  chefId:           string
  orderId?:         string
  paymentId?:       string
  type:             LedgerEntryType
  grossAmountCents: number
  platformFeeCents: number
  netAmountCents:   number
  currency:         string
  status:           LedgerEntryStatus
  availableAt:      Date
  idempotencyKey?:  string
  createdAt:        Date
  updatedAt:        Date
}

const earningsLedgerSchema = new Schema<IEarningsLedger>(
  {
    chefId:           { type: String, required: true },
    orderId:          { type: String },
    paymentId:        { type: String },
    type:             { type: String, enum: LedgerEntryTypeValues, required: true },
    grossAmountCents: { type: Number, required: true, min: 0 },
    platformFeeCents: { type: Number, required: true, min: 0 },
    netAmountCents:   { type: Number, required: true },
    currency:         { type: String, required: true },
    status:           { type: String, enum: LedgerEntryStatusValues, default: 'PENDING' },
    availableAt:      { type: Date, required: true },
    idempotencyKey:   { type: String },
  },
  { timestamps: true },
)

earningsLedgerSchema.index({ chefId: 1, createdAt: -1 })
earningsLedgerSchema.index({ chefId: 1, status: 1, type: 1 })
earningsLedgerSchema.index({ idempotencyKey: 1 }, { unique: true, sparse: true })

export const EarningsLedger = mongoose.model<IEarningsLedger>('EarningsLedger', earningsLedgerSchema, 'earningsledger')
