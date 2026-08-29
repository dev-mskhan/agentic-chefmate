import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  addToCart as rawAddToCart,
  clearCart as rawClearCart,
  getCart as rawGetCart,
  removeFromCart as rawRemoveFromCart,
  updateCartItemQuantity as rawUpdateQty,
  type CartItem,
  type LocalCart,
} from '../../services/cart'

interface CartStoreState extends LocalCart {
  addItem: (chefId: string, dishId: string, forceReplace?: boolean) => { success: boolean; conflict?: boolean; existingChefId?: string }
  removeItem: (dishId: string) => void
  updateQuantity: (dishId: string, quantity: number) => void
  setDeliveryDate: (date: string) => void
  clear: () => void
  reload: () => void
}

export const useCartStore = create<CartStoreState>()(
  persist(
    (set, get) => ({
      ...rawGetCart(),
      addItem: (chefId: string, dishId: string, forceReplace = false) => {
        const res = rawAddToCart(chefId, dishId, forceReplace)
        if (res.success) {
          set(rawGetCart())
        }
        return res
      },
      removeItem: (dishId: string) => {
        rawRemoveFromCart(dishId)
        set(rawGetCart())
      },
      updateQuantity: (dishId: string, quantity: number) => {
        rawUpdateQty(dishId, quantity)
        set(rawGetCart())
      },
      setDeliveryDate: (date: string) => {
        const current = get()
        set({ ...current, deliveryDate: date })
      },
      clear: () => {
        rawClearCart()
        set({ chefId: '', items: [] as CartItem[], deliveryDate: undefined, addressId: undefined, couponCode: undefined })
      },
      reload: () => {
        set(rawGetCart())
      },
    }),
    {
      name: 'chefmate-cart-storage',
    },
  ),
)
