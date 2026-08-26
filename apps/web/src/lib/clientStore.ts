import { create } from 'zustand'

interface CartItem { id: string; chefId: string; name: string; price: number; quantity: number }

interface ClientState {
  cart: CartItem[]
  isCartOpen: boolean
  notice: string | null
  addToCart: (item: Omit<CartItem, 'quantity'>) => void
  removeFromCart: (id: string) => void
  updateQuantity: (id: string, quantity: number) => void
  clearCart: () => void
  setCartOpen: (isOpen: boolean) => void
  setNotice: (notice: string | null) => void
}

export const useClientStore = create<ClientState>((set) => ({
  cart: [],
  isCartOpen: false,
  notice: null,
  addToCart: (item) => set((state) => {
    const currentChef = state.cart[0]?.chefId
    if (currentChef && currentChef !== item.chefId) {
      return { notice: 'Your cart can include dishes from one chef at a time.' }
    }
    const existing = state.cart.find((cartItem) => cartItem.id === item.id)
    if (existing) return { cart: state.cart.map((cartItem) => cartItem.id === item.id ? { ...cartItem, quantity: cartItem.quantity + 1 } : cartItem), notice: null }
    return { cart: [...state.cart, { ...item, quantity: 1 }], notice: null }
  }),
  removeFromCart: (id) => set((state) => ({ cart: state.cart.filter((item) => item.id !== id) })),
  updateQuantity: (id, quantity) => set((state) => ({
    cart: quantity > 0
      ? state.cart.map((item) => item.id === id ? { ...item, quantity: Math.floor(quantity) } : item)
      : state.cart.filter((item) => item.id !== id),
  })),
  clearCart: () => set({ cart: [] }),
  setCartOpen: (isCartOpen) => set({ isCartOpen }),
  setNotice: (notice) => set({ notice }),
}))

export const getCartCount = (cart: CartItem[]) => cart.reduce((total, item) => total + item.quantity, 0)
