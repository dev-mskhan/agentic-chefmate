import type { CartInput } from './api/publicCatalog'

export interface CartItem {
  dishId: string
  quantity: number
}

export interface LocalCart {
  chefId: string
  items: CartItem[]
  deliveryDate?: string
  addressId?: string
  couponCode?: string
}

export type CartState = LocalCart

const cartKey = 'chefmate-cart'

export function readCart(): LocalCart | null {
  try {
    const value = window.localStorage.getItem(cartKey)
    return value ? (JSON.parse(value) as LocalCart) : null
  } catch {
    return null
  }
}

export function getCart(): LocalCart {
  return readCart() || { chefId: '', items: [] }
}

export function writeCart(cart: LocalCart | null) {
  if (cart) window.localStorage.setItem(cartKey, JSON.stringify(cart))
  else window.localStorage.removeItem(cartKey)
  window.dispatchEvent(new Event('chefmate-cart-updated'))
}

export function clearCart() {
  writeCart(null)
}

export function addToCart(
  chefId: string,
  dishId: string,
  forceReplace = false,
): { success: boolean; conflict?: boolean; existingChefId?: string } {
  const current = readCart()

  if (current && current.chefId && current.chefId !== chefId && current.items.length > 0 && !forceReplace) {
    return { success: false, conflict: true, existingChefId: current.chefId }
  }

  const cart = !current || current.chefId !== chefId || forceReplace ? { chefId, items: [] } : current
  const item = cart.items.find((entry) => entry.dishId === dishId)
  if (item) item.quantity += 1
  else cart.items.push({ dishId, quantity: 1 })
  writeCart(cart)
  return { success: true }
}

export function removeFromCart(dishId: string) {
  const current = readCart()
  if (!current) return
  current.items = current.items.filter((item) => item.dishId !== dishId)
  writeCart(current)
}

export function updateCartItemQuantity(dishId: string, quantity: number) {
  const current = readCart()
  if (!current) return
  if (quantity <= 0) {
    removeFromCart(dishId)
    return
  }
  const item = current.items.find((entry) => entry.dishId === dishId)
  if (item) {
    item.quantity = quantity
    writeCart(current)
  }
}

export function toCheckoutInput(
  cart: LocalCart,
  deliveryDate: string,
  addressId: string,
  couponCode?: string,
): CartInput {
  return { chefId: cart.chefId, items: cart.items, deliveryDate, addressId, couponCode: couponCode || undefined }
}
