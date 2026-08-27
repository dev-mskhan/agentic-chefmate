import type { CartInput } from './api/publicCatalog'

export interface CartItem {
  dishId: string
  quantity: number
}

export interface LocalCart {
  chefId: string
  items: CartItem[]
}

const cartKey = 'chefmate-cart'

export function readCart(): LocalCart | null {
  try {
    const value = window.localStorage.getItem(cartKey)
    return value ? (JSON.parse(value) as LocalCart) : null
  } catch {
    return null
  }
}

export function writeCart(cart: LocalCart | null) {
  if (cart) window.localStorage.setItem(cartKey, JSON.stringify(cart))
  else window.localStorage.removeItem(cartKey)
  window.dispatchEvent(new Event('chefmate-cart-updated'))
}

export function addToCart(
  chefId: string,
  dishId: string,
  forceReplace = false,
): { success: boolean; conflict?: boolean; existingChefId?: string } {
  const current = readCart()

  if (current && current.chefId !== chefId && current.items.length > 0 && !forceReplace) {
    return { success: false, conflict: true, existingChefId: current.chefId }
  }

  const cart = !current || current.chefId !== chefId || forceReplace ? { chefId, items: [] } : current
  const item = cart.items.find((entry) => entry.dishId === dishId)
  if (item) item.quantity += 1
  else cart.items.push({ dishId, quantity: 1 })
  writeCart(cart)
  return { success: true }
}

export function toCheckoutInput(
  cart: LocalCart,
  deliveryDate: string,
  addressId: string,
  couponCode?: string,
): CartInput {
  return { chefId: cart.chefId, items: cart.items, deliveryDate, addressId, couponCode: couponCode || undefined }
}
