import { lazy, Suspense } from 'react'
import { BrowserRouter, Outlet, Route, Routes } from 'react-router-dom'
import { RouteFallback } from './components/atoms/RouteFallback'
import type { UserRole } from './types/domain'
import { isRoleAllowed } from './lib/auth'

const LandingPage = lazy(() =>
  import('./pages/LandingPage').then(({ LandingPage: page }) => ({ default: page })),
)
const DiscoveryPage = lazy(() =>
  import('./pages/WorkspacePage').then(({ DiscoveryPage: page }) => ({ default: page })),
)
const PublicPage = lazy(() =>
  import('./pages/WorkspacePage').then(({ PublicPage: page }) => ({ default: page })),
)
const WorkspacePage = lazy(() =>
  import('./pages/WorkspacePage').then(({ WorkspacePage: page }) => ({ default: page })),
)
const ForbiddenPage = lazy(() =>
  import('./pages/AccessPages').then(({ ForbiddenPage: page }) => ({ default: page })),
)
const NotFoundPage = lazy(() =>
  import('./pages/AccessPages').then(({ NotFoundPage: page }) => ({ default: page })),
)

function RequireRole({ allowedRoles }: { allowedRoles: UserRole[] }) {
  return isRoleAllowed(allowedRoles) ? <Outlet /> : <ForbiddenPage />
}

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/discover" element={<DiscoveryPage />} />
          <Route path="/signin" element={<PublicPage title="Sign in" description="Sign-in is represented by the gateway seam in demo mode." />} />
          <Route path="/signup" element={<PublicPage title="Create an account" description="Create a customer account through the secure gateway when integration is enabled." />} />

          <Route element={<RequireRole allowedRoles={['USER']} />}>
            <Route path="/account" element={<WorkspacePage role="Customer" title="Your table, at a glance." description="Keep an eye on orders, favourites, and the next meal waiting for you." />} />
            <Route path="/chefs/:chefId" element={<WorkspacePage role="Customer" title="Chef profile" description="Meet the cook behind the table." />} />
            <Route path="/dishes/:dishId" element={<WorkspacePage role="Customer" title="Dish details" description="A closer look at a home-cooked favourite." />} />
            <Route path="/plans/:planId" element={<WorkspacePage role="Customer" title="Meal plan details" description="Plan generous meals ahead." />} />
            <Route path="/cart" element={<WorkspacePage role="Customer" title="Your cart" description="Review dishes from one kitchen before checkout." />} />
            <Route path="/checkout" element={<WorkspacePage role="Customer" title="Checkout" description="Confirm delivery details and review the order." />} />
            <Route path="/orders" element={<WorkspacePage role="Customer" title="Orders" description="Follow every order from confirmation to delivery." />} />
            <Route path="/orders/:orderId" element={<WorkspacePage role="Customer" title="Order timeline" description="The latest status for your order." />} />
            <Route path="/subscriptions" element={<WorkspacePage role="Customer" title="Subscriptions" description="Manage recurring meals at your pace." />} />
            <Route path="/subscriptions/:subscriptionId" element={<WorkspacePage role="Customer" title="Subscription details" description="Review the next delivery and subscription status." />} />
            <Route path="/messages" element={<WorkspacePage role="Customer" title="Messages" description="Keep the conversation close to the kitchen." />} />
            <Route path="/reviews" element={<WorkspacePage role="Customer" title="Reviews" description="Share a thoughtful note about your meals." />} />
            <Route path="/favorites" element={<WorkspacePage role="Customer" title="Favourites" description="Your saved chefs, dishes, and plans." />} />
            <Route path="/notifications" element={<WorkspacePage role="Customer" title="Notifications" description="Useful updates from ChefMate." />} />
            <Route path="/profile" element={<WorkspacePage role="Customer" title="Profile" description="Keep your account and delivery details current." />} />
            <Route path="/settings" element={<WorkspacePage role="Customer" title="Settings" description="Tune preferences and notifications." />} />
          </Route>

          <Route element={<RequireRole allowedRoles={['CHEF']} />}>
            <Route path="/chef" element={<WorkspacePage role="Chef" title="A calm kitchen dashboard." description="See what needs attention today, without the noise." />} />
            <Route path="/chef/onboarding" element={<WorkspacePage role="Chef" title="Set up your kitchen" description="Move from profile to your first published dish." />} />
            <Route path="/chef/profile" element={<WorkspacePage role="Chef" title="Kitchen profile" description="Shape the public story of your home kitchen." />} />
            <Route path="/chef/dishes" element={<WorkspacePage role="Chef" title="Dishes" description="Manage your active menu and availability." />} />
            <Route path="/chef/dishes/new" element={<WorkspacePage role="Chef" title="New dish" description="Add a dish with its canonical ingredients and dietary details." />} />
            <Route path="/chef/dishes/:dishId/edit" element={<WorkspacePage role="Chef" title="Edit dish" description="Update this dish without losing its history." />} />
            <Route path="/chef/plans" element={<WorkspacePage role="Chef" title="Meal plans" description="Build thoughtful one-off and recurring menus." />} />
            <Route path="/chef/plans/new" element={<WorkspacePage role="Chef" title="New meal plan" description="Package a generous menu for the weeks ahead." />} />
            <Route path="/chef/plans/:planId/edit" element={<WorkspacePage role="Chef" title="Edit meal plan" description="Keep pricing, frequency, and servings in sync." />} />
            <Route path="/chef/schedule" element={<WorkspacePage role="Chef" title="Schedule" description="Set the days and times your kitchen is available." />} />
            <Route path="/chef/orders" element={<WorkspacePage role="Chef" title="Incoming orders" description="Handle each order through its lifecycle." />} />
            <Route path="/chef/orders/:orderId" element={<WorkspacePage role="Chef" title="Order detail" description="Review customer context and delivery timing." />} />
            <Route path="/chef/reviews" element={<WorkspacePage role="Chef" title="Reviews" description="Read what customers remember about your food." />} />
            <Route path="/chef/messages" element={<WorkspacePage role="Chef" title="Messages" description="Stay close to customers when details matter." />} />
            <Route path="/chef/analytics" element={<WorkspacePage role="Chef" title="Analytics" description="Read the shape of your kitchen over time." />} />
            <Route path="/chef/earnings" element={<WorkspacePage role="Chef" title="Earnings" description="See credits, holds, and releases clearly." />} />
            <Route path="/chef/payouts" element={<WorkspacePage role="Chef" title="Payouts" description="Track payout status and arrival dates." />} />
            <Route path="/chef/settings" element={<WorkspacePage role="Chef" title="Settings" description="Manage kitchen preferences and notifications." />} />
          </Route>

          <Route element={<RequireRole allowedRoles={['ADMIN']} />}>
            <Route path="/admin" element={<WorkspacePage role="Admin" title="Operations, kept clear." description="A neutral view of the marketplace and its queues." />} />
            <Route path="/admin/users" element={<WorkspacePage role="Admin" title="Users" description="Inspect customer and chef accounts." />} />
            <Route path="/admin/chefs" element={<WorkspacePage role="Admin" title="Chef verification" description="Review onboarding and account states." />} />
            <Route path="/admin/moderation" element={<WorkspacePage role="Admin" title="Moderation" description="Resolve reports with an audit-friendly trail." />} />
            <Route path="/admin/orders" element={<WorkspacePage role="Admin" title="Orders" description="Inspect marketplace order operations." />} />
            <Route path="/admin/payouts" element={<WorkspacePage role="Admin" title="Payouts" description="Review payout operations and exceptions." />} />
            <Route path="/admin/coupons" element={<WorkspacePage role="Admin" title="Coupons" description="Manage promotional codes and validity." />} />
            <Route path="/admin/reviews" element={<WorkspacePage role="Admin" title="Reviews" description="Moderate public customer feedback." />} />
            <Route path="/admin/notifications" element={<WorkspacePage role="Admin" title="Notifications" description="Inspect notification delivery." />} />
            <Route path="/admin/dlq" element={<WorkspacePage role="Admin" title="Dead-letter queue" description="Recover failed events safely." />} />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default App
