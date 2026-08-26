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
const CheckoutPage = lazy(() => import('./pages/CheckoutPage').then(({ CheckoutPage: page }) => ({ default: page })))
const ConfirmationPage = lazy(() => import('./pages/CheckoutPage').then(({ ConfirmationPage: page }) => ({ default: page })))

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
          <Route path="/checkout/confirmation" element={<ConfirmationPage />} />
          <Route path="*" element={<LandingPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default App
