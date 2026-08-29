import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { RouteFallback } from './components/atoms/RouteFallback'

// Public & Discovery Pages
const LandingPage = lazy(() =>
  import('./pages/LandingPage').then(({ LandingPage: page }) => ({ default: page })),
)
const DiscoverPage = lazy(() =>
  import('./pages/DiscoverPage').then(({ DiscoverPage: page }) => ({ default: page })),
)
const ChefDetailPage = lazy(() =>
  import('./pages/DetailPages').then(({ ChefDetailPage: page }) => ({ default: page })),
)
const DishDetailPage = lazy(() =>
  import('./pages/DetailPages').then(({ DishDetailPage: page }) => ({ default: page })),
)
const MealPlanDetailPage = lazy(() =>
  import('./pages/DetailPages').then(({ MealPlanDetailPage: page }) => ({ default: page })),
)
const CartPage = lazy(() =>
  import('./pages/CartPage').then(({ CartPage: page }) => ({ default: page })),
)

// Auth Pages (AuthShell split-screen)
const SignInPage = lazy(() =>
  import('./pages/auth/SignInPage').then(({ SignInPage: page }) => ({ default: page })),
)
const SignUpPage = lazy(() =>
  import('./pages/auth/SignUpPage').then(({ SignUpPage: page }) => ({ default: page })),
)
const ForgotPasswordPage = lazy(() =>
  import('./pages/auth/ForgotPasswordPage').then(({ ForgotPasswordPage: page }) => ({
    default: page,
  })),
)

// Customer Checkout Flow
const CheckoutPage = lazy(() =>
  import('./pages/customer/CheckoutPage').then(({ CheckoutPage: page }) => ({ default: page })),
)
const OrderConfirmationPage = lazy(() =>
  import('./pages/customer/OrderConfirmationPage').then(({ OrderConfirmationPage: page }) => ({
    default: page,
  })),
)

// Customer Dashboard & Identity Pages
const OrdersPage = lazy(() =>
  import('./pages/customer/OrdersPage').then(({ OrdersPage: page }) => ({ default: page })),
)
const OrderDetailPage = lazy(() =>
  import('./pages/customer/OrderDetailPage').then(({ OrderDetailPage: page }) => ({
    default: page,
  })),
)
const SubscriptionsPage = lazy(() =>
  import('./pages/customer/SubscriptionsPage').then(({ SubscriptionsPage: page }) => ({
    default: page,
  })),
)
const ProfilePage = lazy(() =>
  import('./pages/customer/ProfilePage').then(({ ProfilePage: page }) => ({ default: page })),
)
const NotificationsPage = lazy(() =>
  import('./pages/customer/NotificationsPage').then(({ NotificationsPage: page }) => ({
    default: page,
  })),
)
const FavoritesPage = lazy(() =>
  import('./pages/customer/FavoritesPage').then(({ FavoritesPage: page }) => ({ default: page })),
)

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          {/* Public & Discovery */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/discover" element={<DiscoverPage />} />
          <Route path="/chefs/:chefId" element={<ChefDetailPage />} />
          <Route path="/dishes/:dishId" element={<DishDetailPage />} />
          <Route path="/plans/:planId" element={<MealPlanDetailPage />} />
          <Route path="/cart" element={<CartPage />} />

          {/* Auth */}
          <Route path="/signin" element={<SignInPage />} />
          <Route path="/auth/sign-in" element={<SignInPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/auth/sign-up" element={<SignUpPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />

          {/* Customer Checkout */}
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/checkout/confirmation" element={<OrderConfirmationPage />} />

          {/* Customer Dashboard & Identity */}
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/orders/:orderId" element={<OrderDetailPage />} />
          <Route path="/subscriptions" element={<SubscriptionsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/settings" element={<ProfilePage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/favorites" element={<FavoritesPage />} />

          {/* Fallback */}
          <Route path="*" element={<LandingPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default App
