import mongoose, { Schema, Document } from 'mongoose'

export const OrderStatusValues = [
  'PENDING', 'CONFIRMED', 'PREPARING', 'READY',
  'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED',
] as const
export type OrderStatus = typeof OrderStatusValues[number]

export const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING:          ['CONFIRMED', 'CANCELLED'],
  CONFIRMED:        ['PREPARING', 'CANCELLED'],
  PREPARING:        ['READY'],
  READY:            ['OUT_FOR_DELIVERY'],
  OUT_FOR_DELIVERY: ['DELIVERED'],
  DELIVERED:        [],
  CANCELLED:        [],
}

export function isValidTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false
}

export const CancellationReasonValues = [
  'CUSTOMER_REQUEST', 'CHEF_UNAVAILABLE', 'ITEM_UNAVAILABLE',
  'CAPACITY_FULL', 'OTHER',
] as const
export type CancellationReason = typeof CancellationReasonValues[number]

export const OrderTypeValues = ['ONE_OFF', 'SUBSCRIPTION'] as const
export type OrderType = typeof OrderTypeValues[number]

export interface IOrderItemSnapshot {
  dishId: string; name: string; description?: string
  quantity: number; unitPrice: number; currency: string
  subtotal: number; dietaryTags: string[]; allergens: string[]
}

export interface IAddressSnapshot {
  addressId: string; label: string; addressLine: string; area?: string
  city: string; province?: string; postalCode?: string
  location?: { type: 'Point'; coordinates: [number, number] }
  deliveryInstructions?: string
}

export interface IPricing {
  subtotal:       number
  deliveryFee:    number
  discountAmount: number   // 0 when no coupon applied
  total:          number
  currency:       string
  couponCode?:    string   // snapshot of the coupon code used, if any
}

export interface ICancellation {
  reason: CancellationReason; note?: string
  cancelledBy: 'CUSTOMER' | 'CHEF' | 'ADMIN'; cancelledAt: Date
}

export interface IOrder extends Document {
  customerId: string; chefId: string; deliveryDate: string
  items: IOrderItemSnapshot[]; deliveryAddress: IAddressSnapshot
  pricing: IPricing; customerNote?: string; status: OrderStatus
  cancellation?: ICancellation; idempotencyKey?: string
  orderType:       OrderType
  subscriptionId?: string
  createdAt: Date; updatedAt: Date
}

const orderItemSchema = new Schema<IOrderItemSnapshot>(
  {
    dishId: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true },
    subtotal: { type: Number, required: true, min: 0 },
    dietaryTags: { type: [String], default: [] },
    allergens: { type: [String], default: [] },
  },
  { _id: false },
)

const geoPointSchema = new Schema(
  { type: { type: String, enum: ['Point'], default: 'Point' }, coordinates: { type: [Number] } },
  { _id: false },
)

const addressSnapshotSchema = new Schema<IAddressSnapshot>(
  {
    addressId: { type: String, required: true },
    label: { type: String, required: true },
    addressLine: { type: String, required: true },
    area: { type: String },
    city: { type: String, required: true },
    province: { type: String },
    postalCode: { type: String },
    location: { type: geoPointSchema },
    deliveryInstructions: { type: String },
  },
  { _id: false },
)

const pricingSchema = new Schema<IPricing>(
  {
    subtotal:       { type: Number, required: true, min: 0 },
    deliveryFee:    { type: Number, required: true, min: 0, default: 0 },
    discountAmount: { type: Number, required: true, min: 0, default: 0 },
    total:          { type: Number, required: true, min: 0 },
    currency:       { type: String, required: true },
    couponCode:     { type: String },
  },
  { _id: false },
)

const cancellationSchema = new Schema<ICancellation>(
  {
    reason: { type: String, enum: CancellationReasonValues, required: true },
    note: { type: String },
    cancelledBy: { type: String, enum: ['CUSTOMER', 'CHEF', 'ADMIN'], required: true },
    cancelledAt: { type: Date, required: true },
  },
  { _id: false },
)

const orderSchema = new Schema<IOrder>(
  {
    customerId: { type: String, required: true },
    chefId: { type: String, required: true },
    deliveryDate: { type: String, required: true },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: [(v: IOrderItemSnapshot[]) => v.length >= 1 && v.length <= 50, 'Must have 1–50 items'],
    },
    deliveryAddress: { type: addressSnapshotSchema, required: true },
    pricing: { type: pricingSchema, required: true },
    customerNote: { type: String, maxlength: 500 },
    status: { type: String, enum: OrderStatusValues, default: 'PENDING' },
    cancellation: { type: cancellationSchema },
    idempotencyKey: { type: String, sparse: true, unique: true },
    orderType:      { type: String, enum: OrderTypeValues, default: 'ONE_OFF', required: true },
    subscriptionId: { type: String },
  },
  { timestamps: true },
)

orderSchema.index({ customerId: 1, createdAt: -1 })
orderSchema.index({ chefId: 1, createdAt: -1 })
orderSchema.index({ status: 1, createdAt: -1 })
orderSchema.index({ chefId: 1, status: 1, createdAt: -1 })
orderSchema.index({ idempotencyKey: 1 }, { unique: true, sparse: true })
orderSchema.index({ subscriptionId: 1, createdAt: -1 }, { sparse: true })

export const Order = mongoose.model<IOrder>('Order', orderSchema, 'orders')
