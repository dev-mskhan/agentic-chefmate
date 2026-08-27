import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { RouteFallback } from './components/atoms/RouteFallback'

const LandingPage = lazy(() =>
  import('./pages/LandingPage').then(({ LandingPage: page }) => ({ default: page })),
)
const DiscoverPage = lazy(() => import('./pages/DiscoverPage').then(({ DiscoverPage: page }) => ({ default: page })))
const ChefDetailPage = lazy(() => import('./pages/DetailPages').then(({ ChefDetailPage: page }) => ({ default: page })))
const DishDetailPage = lazy(() => import('./pages/DetailPages').then(({ DishDetailPage: page }) => ({ default: page })))
const MealPlanDetailPage = lazy(() => import('./pages/DetailPages').then(({ MealPlanDetailPage: page }) => ({ default: page })))
const CartPage = lazy(() => import('./pages/CartPage').then(({ CartPage: page }) => ({ default: page })))

// Customer Checkout & Confirmation Flow
const CheckoutPage = lazy(() =>
  import('./pages/customer/CheckoutPage').then(({ CheckoutPage: page }) => ({ default: page })),
)
const OrderConfirmationPage = lazy(() =>
  import('./pages/customer/OrderConfirmationPage').then(({ OrderConfirmationPage: page }) => ({ default: page })),
)

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/discover" element={<DiscoverPage />} />
          <Route path="/chefs/:chefId" element={<ChefDetailPage />} />
          <Route path="/dishes/:dishId" element={<DishDetailPage />} />
          <Route path="/plans/:planId" element={<MealPlanDetailPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/orders/:orderId" element={<OrderConfirmationPage />} />
          <Route path="/checkout/confirmation" element={<OrderConfirmationPage />} />
          <Route path="*" element={<LandingPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default App
