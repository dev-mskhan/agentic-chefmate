import type {
  AddressRecord,
  AuthUser,
  CheckoutPreviewInput,
  CheckoutPreviewResult,
  CheckoutSubmitInput,
  CheckoutSubmitResult,
  DishSnapshot,
  OrderStatusDetails,
} from '../../features/checkout/types'

function delay(ms = 300): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

const EXISTING_EMAILS: Record<string, string> = {
  'customer@chefmate.com': 'Password123!',
  'user@example.com': 'Password123!',
  'ayesha@chefmate.com': 'Password123!',
}

let MOCK_ADDRESSES: AddressRecord[] = [
  {
    id: 'addr-1',
    userId: 'usr-101',
    label: 'Home',
    line1: 'House 42, Block 4, Gulberg III',
    area: 'Gulberg',
    city: 'Lahore',
    postalCode: '54000',
    isDefault: true,
  },
  {
    id: 'addr-2',
    userId: 'usr-101',
    label: 'Office',
    line1: 'Level 5, Arfa Software Technology Park, Ferozepur Road',
    area: 'Ferozepur Road',
    city: 'Lahore',
    postalCode: '54600',
    isDefault: false,
  },
]

export const CHEFS_DB: Record<string, { id: string; displayName: string; availableDays: string[] }> = {
  'chef-ayesha-khan': {
    id: 'chef-ayesha-khan',
    displayName: 'Chef Ayesha Khan',
    availableDays: ['TUE', 'WED', 'THU', 'FRI', 'SAT'],
  },
  'chef-hamza-malik': {
    id: 'chef-hamza-malik',
    displayName: 'Chef Hamza Malik',
    availableDays: ['TUE', 'THU', 'SAT'],
  },
  'chef-1': {
    id: 'chef-1',
    displayName: 'Chef Fatima Ahmad',
    availableDays: ['TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'],
  },
}

export const DISHES_DB: Record<string, { id: string; chefId: string; name: string; price: number; currency: string; active: boolean; availableDays: string[]; image: string }> = {
  'dish-smoky-karahi': {
    id: 'dish-smoky-karahi',
    chefId: 'chef-ayesha-khan',
    name: 'Smoky chicken karahi',
    price: 2400,
    currency: 'PKR',
    active: true,
    availableDays: ['TUE', 'WED', 'THU', 'FRI', 'SAT'],
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=300&q=80',
  },
  'dish-lemon-rice': {
    id: 'dish-lemon-rice',
    chefId: 'chef-hamza-malik',
    name: 'Lemon herb rice',
    price: 1200,
    currency: 'PKR',
    active: false, // DRAFT in backend
    availableDays: ['TUE', 'THU'],
    image: 'https://images.unsplash.com/photo-1626074353765-517a681e40be?w=300&q=80',
  },
  'dish-archived-daal': {
    id: 'dish-archived-daal',
    chefId: 'chef-ayesha-khan',
    name: 'Smoked yellow daal',
    price: 950,
    currency: 'PKR',
    active: false, // ARCHIVED
    availableDays: ['FRI'],
    image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=300&q=80',
  },
  'dish-1': {
    id: 'dish-1',
    chefId: 'chef-ayesha-khan',
    name: 'Special Chicken Biryani',
    price: 850,
    currency: 'PKR',
    active: true,
    availableDays: ['TUE', 'WED', 'THU', 'FRI', 'SAT'],
    image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=300&q=80',
  },
  'dish-2': {
    id: 'dish-2',
    chefId: 'chef-ayesha-khan',
    name: 'Shahi Paneer Butter Masala',
    price: 750,
    currency: 'PKR',
    active: true,
    availableDays: ['TUE', 'WED', 'THU', 'FRI', 'SAT'],
    image: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=300&q=80',
  },
  'dish-3': {
    id: 'dish-3',
    chefId: 'chef-ayesha-khan',
    name: 'Fresh Tandoori Naan (3 pcs)',
    price: 180,
    currency: 'PKR',
    active: true,
    availableDays: ['TUE', 'WED', 'THU', 'FRI', 'SAT'],
    image: 'https://images.unsplash.com/photo-1626074353765-517a681e40be?w=300&q=80',
  },
  'dish-usd-item': {
    id: 'dish-usd-item',
    chefId: 'chef-ayesha-khan',
    name: 'Special Catering Box (USD)',
    price: 25,
    currency: 'USD',
    active: true,
    availableDays: ['FRI', 'SAT'],
    image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=300&q=80',
  },
  'dish-99': {
    id: 'dish-99',
    chefId: 'chef-ayesha-khan',
    name: 'Seasonal Mango Kheer (Unavailable)',
    price: 400,
    currency: 'PKR',
    active: false,
    availableDays: [],
    image: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=300&q=80',
  },
}

const VALID_COUPONS: Record<string, { code: string; percent: number; maxDiscount: number; minSubtotal: number }> = {
  WELCOME10: { code: 'WELCOME10', percent: 10, maxDiscount: 500, minSubtotal: 1000 },
  CHEF20: { code: 'CHEF20', percent: 20, maxDiscount: 800, minSubtotal: 1500 },
  HALF50: { code: 'HALF50', percent: 50, maxDiscount: 1000, minSubtotal: 2000 },
}

const ORDERS_STORE = new Map<string, OrderStatusDetails>()
const IDEMPOTENCY_MAP = new Map<string, string>()
const PAYMENT_CREATED_AT = new Map<string, number>()

export async function checkEmail(input: { email: string }): Promise<{ exists: boolean; userId?: string }> {
  await delay(250)
  const normalized = input.email.trim().toLowerCase()
  const exists = Boolean(EXISTING_EMAILS[normalized])
  return {
    exists,
    userId: exists ? `usr-${normalized.split('@')[0]}` : undefined,
  }
}

export async function signInInline(input: { email: string; password: string }): Promise<{ user: AuthUser; token: string }> {
  await delay(350)
  const normalized = input.email.trim().toLowerCase()
  const expected = EXISTING_EMAILS[normalized]
  if (!expected || expected !== input.password) {
    throw new Error('Invalid email or password. Please check your credentials.')
  }
  const user: AuthUser = {
    id: `usr-${normalized.split('@')[0]}`,
    email: normalized,
    role: 'USER',
    displayName: normalized.split('@')[0],
  }
  return { user, token: `auth-token-${Date.now()}` }
}

export async function signUpInline(input: { email: string; password: string }): Promise<{ user: AuthUser; token: string }> {
  await delay(400)
  const normalized = input.email.trim().toLowerCase()
  EXISTING_EMAILS[normalized] = input.password
  const user: AuthUser = {
    id: `usr-${normalized.split('@')[0]}`,
    email: normalized,
    role: 'USER',
    displayName: normalized.split('@')[0],
  }
  return { user, token: `auth-token-${Date.now()}` }
}

export async function getAddresses(userId?: string): Promise<AddressRecord[]> {
  await delay(250)
  if (!userId) return []
  return MOCK_ADDRESSES.filter((a) => !a.userId || a.userId === userId)
}

export async function createAddress(
  userId: string | undefined,
  address: Omit<AddressRecord, 'id'>,
): Promise<AddressRecord> {
  await delay(300)
  if (address.isDefault) {
    MOCK_ADDRESSES = MOCK_ADDRESSES.map((a) => ({ ...a, isDefault: false }))
  }
  const newAddr: AddressRecord = {
    ...address,
    id: `addr-${Date.now()}`,
    userId,
  }
  MOCK_ADDRESSES.push(newAddr)
  return newAddr
}

export async function checkChefAvailability(
  chefId: string,
  deliveryDate: string,
): Promise<{ available: boolean; reason?: string }> {
  await delay(200)
  const dateObj = new Date(deliveryDate + 'T00:00:00')
  const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
  const dayName = dayNames[dateObj.getDay()]

  const chef = CHEFS_DB[chefId] || CHEFS_DB['chef-ayesha-khan']

  if (dateObj.getDay() === 1 || deliveryDate.endsWith('-31')) {
    return {
      available: false,
      reason: `${chef.displayName} is off on Mondays and month-end dates. Please choose another delivery date.`,
    }
  }

  if (chef.availableDays && !chef.availableDays.includes(dayName)) {
    return {
      available: false,
      reason: `${chef.displayName} is only available on ${chef.availableDays.join(', ')}.`,
    }
  }

  return { available: true }
}

export async function validateCoupon(
  couponCode: string,
  _chefId: string,
  subtotal = 0,
): Promise<{ valid: boolean; discountAmount?: number; code?: string; reason?: string }> {
  await delay(250)
  const cleanCode = couponCode.trim().toUpperCase()
  const coupon = VALID_COUPONS[cleanCode]
  if (!coupon) {
    return {
      valid: false,
      reason: 'Coupon code is invalid or has expired.',
    }
  }
  if (subtotal > 0 && subtotal < coupon.minSubtotal) {
    return {
      valid: false,
      reason: `Coupon ${coupon.code} requires a minimum order subtotal of PKR ${coupon.minSubtotal.toLocaleString()}.`,
    }
  }
  return {
    valid: true,
    code: coupon.code,
  }
}

export async function checkoutPreview(input: CheckoutPreviewInput): Promise<CheckoutPreviewResult> {
  await delay(300)
  const invalidDishIds: string[] = []
  const dishChefs: string[] = []
  const currencies: string[] = []
  let subtotal = 0

  for (const item of input.items) {
    const dish = DISHES_DB[item.dishId]
    if (!dish || !dish.active) {
      invalidDishIds.push(item.dishId)
    } else {
      subtotal += dish.price * item.quantity
      dishChefs.push(dish.chefId)
      currencies.push(dish.currency)
    }
  }

  if (invalidDishIds.length > 0) {
    return {
      subtotal: 0,
      deliveryFee: 0,
      discountAmount: 0,
      total: 0,
      currency: 'PKR',
      invalidDishIds,
    }
  }

  // Multi-chef validation
  const uniqueChefs = [...new Set(dishChefs)]
  if (uniqueChefs.length > 1) {
    throw new Error('All dishes in an order must come from the same chef.')
  }

  // Mixed currency validation
  const uniqueCurrencies = [...new Set(currencies)]
  if (uniqueCurrencies.length > 1) {
    throw new Error('All dishes in an order must share the same currency.')
  }

  const mainCurrency = uniqueCurrencies[0] || 'PKR'
  const deliveryFee = mainCurrency === 'USD' ? 5 : 250
  let discountAmount = 0

  if (input.couponCode) {
    const coupon = VALID_COUPONS[input.couponCode.trim().toUpperCase()]
    if (coupon && subtotal >= coupon.minSubtotal) {
      discountAmount = Math.min(Math.round((subtotal * coupon.percent) / 100), coupon.maxDiscount)
    }
  }

  const total = Math.max(0, subtotal + deliveryFee - discountAmount)

  return {
    subtotal,
    deliveryFee,
    discountAmount,
    total,
    currency: mainCurrency,
    couponCode: input.couponCode,
  }
}

export async function checkoutSubmit(input: CheckoutSubmitInput): Promise<CheckoutSubmitResult> {
  await delay(400)

  if (IDEMPOTENCY_MAP.has(input.idempotencyKey)) {
    const existingOrderId = IDEMPOTENCY_MAP.get(input.idempotencyKey)!
    const existingOrder = ORDERS_STORE.get(existingOrderId)!
    return {
      orderId: existingOrder.orderId,
      clientSecret: existingOrder.paymentMethod === 'STRIPE' ? `pi_sec_${existingOrderId}` : undefined,
      status: existingOrder.status,
      paymentStatus: existingOrder.paymentStatus,
    }
  }

  const address = MOCK_ADDRESSES.find((a) => a.id === input.addressId) ?? MOCK_ADDRESSES[0] ?? {
    id: input.addressId,
    label: 'Delivery Address',
    line1: '123 Main Street',
    area: 'Gulberg',
    city: 'Lahore',
    postalCode: '54000',
    isDefault: true,
  }

  const itemsSnapshot: DishSnapshot[] = input.items.map((item) => {
    const dish = DISHES_DB[item.dishId] ?? { name: 'Custom Home Meal', price: 800, image: '', currency: 'PKR' }
    return {
      dishId: item.dishId,
      name: dish.name,
      price: dish.price,
      quantity: item.quantity,
      image: dish.image,
    }
  })

  const chef = CHEFS_DB[input.chefId] || CHEFS_DB['chef-ayesha-khan']
  const subtotal = itemsSnapshot.reduce((acc, i) => acc + i.price * i.quantity, 0)
  const currency = DISHES_DB[input.items[0]?.dishId]?.currency || 'PKR'
  const deliveryFee = currency === 'USD' ? 5 : 250
  let discountAmount = 0

  if (input.couponCode) {
    const coupon = VALID_COUPONS[input.couponCode.trim().toUpperCase()]
    if (coupon && subtotal >= coupon.minSubtotal) {
      discountAmount = Math.min(Math.round((subtotal * coupon.percent) / 100), coupon.maxDiscount)
    }
  }
  const total = Math.max(0, subtotal + deliveryFee - discountAmount)
  const orderId = `ord-${Date.now().toString(36).toUpperCase()}`

  const isStripe = input.paymentMethod === 'STRIPE'
  const initialPaymentStatus = isStripe ? 'AWAITING_CONFIRMATION' : 'COD_PENDING'

  const newOrder: OrderStatusDetails = {
    orderId,
    chefId: input.chefId,
    chefName: chef.displayName,
    status: isStripe ? 'PENDING' : 'CONFIRMED',
    paymentStatus: initialPaymentStatus,
    deliveryDate: input.deliveryDate,
    addressSnapshot: address,
    itemsSnapshot,
    subtotal,
    deliveryFee,
    discountAmount,
    total,
    currency,
    paymentMethod: input.paymentMethod,
    createdAt: new Date().toISOString(),
    idempotencyKey: input.idempotencyKey,
  }

  ORDERS_STORE.set(orderId, newOrder)
  IDEMPOTENCY_MAP.set(input.idempotencyKey, orderId)

  return {
    orderId,
    clientSecret: isStripe ? `pi_sec_${orderId}` : undefined,
    status: newOrder.status,
    paymentStatus: newOrder.paymentStatus,
  }
}

export async function confirmStripePayment(
  clientSecret: string,
  _cardDetails?: { number: string; expMonth: string; expYear: string; cvc: string },
  simulateDecline = false,
): Promise<{ success: boolean; error?: string }> {
  await delay(500)
  if (simulateDecline) {
    return {
      success: false,
      error: 'Your card was declined by the issuing bank. Please check your details or try another card.',
    }
  }
  const orderId = clientSecret.replace('pi_sec_', '')
  const order = ORDERS_STORE.get(orderId)
  if (order) {
    order.paymentStatus = 'AWAITING_CONFIRMATION'
    PAYMENT_CREATED_AT.set(orderId, Date.now())
  }
  return { success: true }
}

export async function getOrderStatus(orderId: string): Promise<OrderStatusDetails> {
  await delay(250)
  const order = ORDERS_STORE.get(orderId)
  if (!order) {
    return {
      orderId,
      chefId: 'chef-ayesha-khan',
      chefName: 'Chef Ayesha Khan',
      status: 'CONFIRMED',
      paymentStatus: 'PAID',
      deliveryDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      addressSnapshot: MOCK_ADDRESSES[0],
      itemsSnapshot: [
        { dishId: 'dish-smoky-karahi', name: DISHES_DB['dish-smoky-karahi'].name, price: 2400, quantity: 1, image: DISHES_DB['dish-smoky-karahi'].image },
      ],
      subtotal: 2400,
      deliveryFee: 250,
      discountAmount: 0,
      total: 2650,
      currency: 'PKR',
      paymentMethod: 'STRIPE',
      createdAt: new Date().toISOString(),
      idempotencyKey: `checkout-fallback-${orderId}`,
    }
  }

  if (order.paymentStatus === 'AWAITING_CONFIRMATION') {
    const startedAt = PAYMENT_CREATED_AT.get(orderId) ?? Date.now()
    if (Date.now() - startedAt > 3500) {
      order.paymentStatus = 'PAID'
      order.status = 'CONFIRMED'
    }
  }

  return { ...order }
}
