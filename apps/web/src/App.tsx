import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { RouteFallback } from './components/atoms/RouteFallback'

const LandingPage = lazy(() =>
  import('./pages/LandingPage').then(({ LandingPage: page }) => ({ default: page })),
)

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="*" element={<LandingPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default App
