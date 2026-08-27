import type { OrderStatus } from '../../types/domain'

export type PaymentMethod = 'STRIPE' | 'COD'

export type CheckoutStatus =
  | 'building'
  | 'previewing'
  | 'submitting'
  | 'awaiting_payment'
  | 'confirmed'
  | 'failed'

export interface CartItem {
  dishId: string
  quantity: number
}

export interface CheckoutState {
  chefId: string
  items: CartItem[]
  deliveryDate?: string
  addressId?: string
  couponCode?: string
  preview?: {
    subtotal: number
    deliveryFee: number
    discountAmount: number
    total: number
    currency: string
    couponCode?: string
    invalidDishIds?: string[]
  }
  paymentMethod?: PaymentMethod
  idempotencyKey?: string
  status: CheckoutStatus
}

export interface AddressRecord {
  id: string
  userId?: string
  label: string
  line1: string
  area: string
  city: string
  postalCode: string
  isDefault: boolean
}

export interface CheckoutPreviewInput {
  chefId: string
  items: CartItem[]
  deliveryDate?: string
  addressId?: string
  couponCode?: string
}

export interface CheckoutPreviewResult {
  subtotal: number
  deliveryFee: number
  discountAmount: number
  total: number
  currency: string
  couponCode?: string
  invalidDishIds?: string[]
}

export interface CheckoutSubmitInput {
  chefId: string
  items: CartItem[]
  deliveryDate: string
  addressId: string
  couponCode?: string
  paymentMethod: PaymentMethod
  idempotencyKey: string
}

export interface CheckoutSubmitResult {
  orderId: string
  clientSecret?: string
  status: OrderStatus
  paymentStatus: 'STRIPE_PENDING' | 'COD_PENDING' | 'PAID' | 'AWAITING_CONFIRMATION' | 'FAILED'
}

export interface DishSnapshot {
  dishId: string
  name: string
  price: number
  quantity: number
  image?: string
}

export interface OrderStatusDetails {
  orderId: string
  chefId: string
  chefName: string
  status: OrderStatus
  paymentStatus: 'PAID' | 'AWAITING_CONFIRMATION' | 'COD_PENDING' | 'FAILED'
  deliveryDate: string
  addressSnapshot: AddressRecord
  itemsSnapshot: DishSnapshot[]
  subtotal: number
  deliveryFee: number
  discountAmount: number
  total: number
  currency: string
  paymentMethod: PaymentMethod
  createdAt: string
  idempotencyKey: string
}

export interface AuthUser {
  id: string
  email: string
  role: 'USER' | 'CHEF' | 'ADMIN'
  displayName?: string
}
