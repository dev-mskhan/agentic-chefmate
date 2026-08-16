import mongoose, { Schema, Document } from 'mongoose'

export const SubscriptionStatusValues = [
  'PENDING', 'ACTIVE', 'PAUSED', 'CANCELLED', 'PAST_DUE', 'COMPLETED',
] as const
export type SubscriptionStatus = typeof SubscriptionStatusValues[number]

export const SubscriptionFrequencyValues = ['WEEKLY', 'BIWEEKLY', 'MONTHLY'] as const
export type SubscriptionFrequency = typeof SubscriptionFrequencyValues[number]

export interface IAddressSnapshot {
  addressId: string; label: string; addressLine: string; area?: string
  city: string; province?: string; postalCode?: string
  location?: { type: 'Point'; coordinates: [number, number] }
  deliveryInstructions?: string
}

export interface IPriceSnapshot {
  amountCents: number
  currency:    string
}

export interface ISubscription extends Document {
  customerId:          string
  chefId:              string
  planId:              string
  tierId?:             string
  status:              SubscriptionStatus
  frequency:           SubscriptionFrequency
  deliveryAddress:     IAddressSnapshot
  selectedDishIds:     string[]
  priceSnapshot:       IPriceSnapshot
  introDiscountAmount: number
  nextBillingDate:     Date
  nextOrderDate:       Date
  currentPeriodStart:  Date
  currentPeriodEnd:    Date
  pausedAt?:           Date
  pauseExpiresAt?:     Date
  cancelledAt?:        Date
  cancellationReason?: string
  skippedPeriods:      string[]
  idempotencyKey?:     string
  stripeCustomerId?:   string
  createdAt:           Date
  updatedAt:           Date
}

const geoPointSchema = new Schema(
  { type: { type: String, enum: ['Point'], default: 'Point' }, coordinates: { type: [Number] } },
  { _id: false },
)

const addressSnapshotSchema = new Schema<IAddressSnapshot>(
  {
    addressId:            { type: String, required: true },
    label:                { type: String, required: true },
    addressLine:          { type: String, required: true },
    area:                 { type: String },
    city:                 { type: String, required: true },
    province:             { type: String },
    postalCode:           { type: String },
    location:             { type: geoPointSchema },
    deliveryInstructions: { type: String },
  },
  { _id: false },
)

const priceSnapshotSchema = new Schema<IPriceSnapshot>(
  {
    amountCents: { type: Number, required: true, min: 0 },
    currency:    { type: String, required: true },
  },
  { _id: false },
)

const subscriptionSchema = new Schema<ISubscription>(
  {
    customerId:          { type: String, required: true },
    chefId:              { type: String, required: true },
    planId:              { type: String, required: true },
    tierId:              { type: String },
    status:              { type: String, enum: SubscriptionStatusValues, default: 'PENDING' },
    frequency:           { type: String, enum: SubscriptionFrequencyValues, required: true },
    deliveryAddress:     { type: addressSnapshotSchema, required: true },
    selectedDishIds:     { type: [String], default: [] },
    priceSnapshot:       { type: priceSnapshotSchema, required: true },
    introDiscountAmount: { type: Number, default: 0, min: 0 },
    nextBillingDate:     { type: Date, required: true },
    nextOrderDate:       { type: Date, required: true },
    currentPeriodStart:  { type: Date, required: true },
    currentPeriodEnd:    { type: Date, required: true },
    pausedAt:            { type: Date },
    pauseExpiresAt:      { type: Date },
    cancelledAt:         { type: Date },
    cancellationReason:  { type: String },
    skippedPeriods:      { type: [String], default: [] },
    idempotencyKey:      { type: String },
    stripeCustomerId:    { type: String },
  },
  { timestamps: true },
)

subscriptionSchema.index({ customerId: 1, status: 1 })
subscriptionSchema.index({ nextBillingDate: 1, status: 1 })
subscriptionSchema.index({ chefId: 1, status: 1 })
subscriptionSchema.index({ idempotencyKey: 1 }, { unique: true, sparse: true })

export const Subscription = mongoose.model<ISubscription>('Subscription', subscriptionSchema, 'subscriptions')
