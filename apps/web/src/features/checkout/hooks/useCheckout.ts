import { useEffect, useState, useCallback, useRef } from 'react'
import { checkoutPreview, checkoutSubmit } from '../../../lib/api/checkout'
import { getCurrentUser, subscribeAuthChange } from '../../../lib/auth'
import { readCart, writeCart } from '../../../services/cart'
import type { AuthUser, CartItem, CheckoutState, PaymentMethod } from '../types'

function generateIdempotencyKey(): string {
  return `ik_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
}

export function useCheckout() {
  const [user, setUser] = useState<AuthUser | null>(() => getCurrentUser())

  // Read local cart or seed with Chef Ayesha Khan's Smoky Chicken Karahi
  const cartData = readCart()
  const initialChefId = cartData?.chefId || 'chef-ayesha-khan'
  const initialItems: CartItem[] = cartData?.items && cartData.items.length > 0
    ? cartData.items
    : [{ dishId: 'dish-smoky-karahi', quantity: 1 }]

  // Tomorrow's date
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]

  const [checkoutState, setCheckoutState] = useState<CheckoutState>({
    chefId: initialChefId,
    items: initialItems,
    deliveryDate: tomorrow,
    addressId: undefined,
    couponCode: undefined,
    paymentMethod: 'STRIPE',
    idempotencyKey: undefined,
    status: 'building',
  })

  const [dateValid, setDateValid] = useState(true)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [clientSecret, setClientSecret] = useState<string | undefined>()

  const [simulatePaymentFailure, setSimulatePaymentFailure] = useState(false)

  const keyDependenciesRef = useRef<string>('')

  useEffect(() => {
    return subscribeAuthChange((updatedUser) => {
      setUser(updatedUser)
    })
  }, [])

  const refreshPreview = useCallback(async (state: CheckoutState) => {
    if (!state.items.length) return
    setPreviewLoading(true)
    setSubmitError('')

    try {
      const res = await checkoutPreview({
        chefId: state.chefId,
        items: state.items,
        deliveryDate: state.deliveryDate,
        addressId: state.addressId,
        couponCode: state.couponCode,
      })

      setCheckoutState((prev) => ({
        ...prev,
        preview: res,
        status: res.invalidDishIds && res.invalidDishIds.length > 0 ? 'failed' : 'previewing',
      }))
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to generate order preview.'
      setSubmitError(msg)
    } finally {
      setPreviewLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshPreview(checkoutState)
  }, [
    checkoutState.chefId,
    JSON.stringify(checkoutState.items),
    checkoutState.deliveryDate,
    checkoutState.addressId,
    checkoutState.couponCode,
  ])

  useEffect(() => {
    if (checkoutState.deliveryDate && checkoutState.addressId && dateValid) {
      const currentDeps = `${checkoutState.chefId}-${JSON.stringify(checkoutState.items)}-${checkoutState.deliveryDate}-${checkoutState.addressId}-${checkoutState.couponCode || ''}`

      if (keyDependenciesRef.current !== currentDeps) {
        keyDependenciesRef.current = currentDeps
        setCheckoutState((prev) => ({
          ...prev,
          idempotencyKey: generateIdempotencyKey(),
        }))
        setClientSecret(undefined)
      }
    }
  }, [
    checkoutState.chefId,
    JSON.stringify(checkoutState.items),
    checkoutState.deliveryDate,
    checkoutState.addressId,
    checkoutState.couponCode,
    dateValid,
  ])

  const setDate = (date: string, isValid: boolean) => {
    setDateValid(isValid)
    setCheckoutState((prev) => ({ ...prev, deliveryDate: date }))
  }

  const setAddress = (addressId: string) => {
    setCheckoutState((prev) => ({ ...prev, addressId }))
  }

  const setCoupon = (couponCode: string | undefined) => {
    setCheckoutState((prev) => ({ ...prev, couponCode }))
  }

  const setPaymentMethod = (paymentMethod: PaymentMethod) => {
    setCheckoutState((prev) => ({ ...prev, paymentMethod }))
  }

  const removeDishItem = (dishId: string) => {
    const updatedItems = checkoutState.items.filter((i) => i.dishId !== dishId)
    setCheckoutState((prev) => ({ ...prev, items: updatedItems }))
    writeCart(updatedItems.length > 0 ? { chefId: checkoutState.chefId, items: updatedItems } : null)
  }

  const injectInactiveDish = () => {
    const updatedItems = [...checkoutState.items, { dishId: 'dish-99', quantity: 1 }]
    setCheckoutState((prev) => ({ ...prev, items: updatedItems }))
    writeCart({ chefId: checkoutState.chefId, items: updatedItems })
  }

  const injectDifferentChefDish = () => {
    // Dish from Chef Hamza Malik (chef-hamza-malik)
    const updatedItems = [...checkoutState.items, { dishId: 'dish-lemon-rice', quantity: 1 }]
    setCheckoutState((prev) => ({ ...prev, items: updatedItems }))
    writeCart({ chefId: checkoutState.chefId, items: updatedItems })
  }

  const injectMixedCurrencyDish = () => {
    const updatedItems = [...checkoutState.items, { dishId: 'dish-usd-item', quantity: 1 }]
    setCheckoutState((prev) => ({ ...prev, items: updatedItems }))
    writeCart({ chefId: checkoutState.chefId, items: updatedItems })
  }

  const triggerSessionExpiry = () => {
    setUser(null)
  }

  const submitOrder = async (): Promise<{ orderId: string; clientSecret?: string } | null> => {
    if (!checkoutState.deliveryDate || !dateValid) {
      setSubmitError('Chef is unavailable on the selected delivery date.')
      return null
    }
    if (!checkoutState.addressId) {
      setSubmitError('Please select or add a delivery address.')
      return null
    }
    if (checkoutState.preview?.invalidDishIds?.length) {
      setSubmitError('Please remove unavailable dishes before submitting.')
      return null
    }

    if (simulatePaymentFailure) {
      setSubmitError('Failed to create payment session. Please try again.')
      setSubmitting(false)
      return null
    }

    const key = checkoutState.idempotencyKey || generateIdempotencyKey()
    setSubmitting(true)
    setSubmitError('')

    try {
      const result = await checkoutSubmit({
        chefId: checkoutState.chefId,
        items: checkoutState.items,
        deliveryDate: checkoutState.deliveryDate,
        addressId: checkoutState.addressId,
        couponCode: checkoutState.couponCode,
        paymentMethod: checkoutState.paymentMethod || 'STRIPE',
        idempotencyKey: key,
      })

      setCheckoutState((prev) => ({
        ...prev,
        idempotencyKey: key,
        status: result.paymentStatus === 'COD_PENDING' ? 'confirmed' : 'awaiting_payment',
      }))

      if (result.clientSecret) {
        setClientSecret(result.clientSecret)
      }

      return { orderId: result.orderId, clientSecret: result.clientSecret }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to place order. Please try again.'
      setSubmitError(msg)
      setCheckoutState((prev) => ({ ...prev, status: 'failed' }))
      return null
    } finally {
      setSubmitting(false)
    }
  }

  return {
    user,
    setUser,
    checkoutState,
    dateValid,
    previewLoading,
    submitError,
    setSubmitError,
    submitting,
    clientSecret,
    setDate,
    setAddress,
    setCoupon,
    setPaymentMethod,
    removeDishItem,
    injectInactiveDish,
    injectDifferentChefDish,
    injectMixedCurrencyDish,
    triggerSessionExpiry,
    simulatePaymentFailure,
    setSimulatePaymentFailure,
    submitOrder,
  }
}
