import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { RouteFallback } from './components/atoms/RouteFallback'
import { CartPage } from './pages/CartPage'
import { ChefDetailPage, DishDetailPage, PlanDetailPage } from './pages/DetailPages'
import { DiscoverPage } from './pages/DiscoverPage'
import { SignInPage, SignUpPage } from './pages/AuthPages'

const LandingPage = lazy(() =>
  import('./pages/LandingPage').then(({ LandingPage: page }) => ({ default: page })),
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
          <Route path="/plans/:planId" element={<PlanDetailPage />} />
          <Route path="/signin" element={<SignInPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="*" element={<LandingPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default App
