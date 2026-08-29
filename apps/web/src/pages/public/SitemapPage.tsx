import { Link } from 'react-router-dom'
import { PublicShell } from '../../components/templates/PublicShell'
import { PageContainer } from '../../components/templates/PageContainer'

const SITEMAP_SECTIONS = [
  {
    title: 'Marketplace & Discovery',
    links: [
      { label: 'Home', href: '/' },
      { label: 'Discover Food Catalog', href: '/discover' },
      { label: 'Browse Home Chefs', href: '/discover?type=chefs' },
      { label: 'Browse Dishes', href: '/discover?type=dishes' },
      { label: 'Browse Recurring Meal Plans', href: '/discover?type=meal-plans' },
      { label: 'Shopping Basket & Checkout', href: '/cart' },
    ],
  },
  {
    title: 'Cities & Regions',
    links: [
      { label: 'Chefs in Lahore', href: '/discover?type=chefs&city=Lahore' },
      { label: 'Chefs in Karachi', href: '/discover?type=chefs&city=Karachi' },
      { label: 'Chefs in Islamabad', href: '/discover?type=chefs&city=Islamabad' },
      { label: 'Chefs in Rawalpindi', href: '/discover?type=chefs&city=Rawalpindi' },
    ],
  },
  {
    title: 'Customer Account',
    links: [
      { label: 'Sign In', href: '/signin' },
      { label: 'Create Account', href: '/signup' },
      { label: 'Forgot Password', href: '/forgot-password' },
      { label: 'Order History & Tracking', href: '/orders' },
      { label: 'Direct Kitchen Messages', href: '/messages' },
      { label: 'Meal Subscriptions', href: '/subscriptions' },
      { label: 'Saved Dishes & Favorites', href: '/favorites' },
      { label: 'Account Profile & Addresses', href: '/profile' },
      { label: 'Notifications Center', href: '/notifications' },
    ],
  },
  {
    title: 'For Chefs & Kitchens',
    links: [
      { label: 'Chef Onboarding & Application', href: '/chef/onboarding' },
      { label: 'Kitchen Management Portal', href: '/chef' },
      { label: 'Incoming Order Queue', href: '/chef/orders' },
      { label: 'Customer Messaging Desk', href: '/chef/messages' },
      { label: 'Dish Menu Management', href: '/chef/dishes' },
      { label: 'Meal Plan Configurations', href: '/chef/plans' },
      { label: 'Cooking Schedule & Capacity', href: '/chef/schedule' },
      { label: 'Kitchen Analytics & Volume', href: '/chef/analytics' },
      { label: 'Disbursements & Earnings', href: '/chef/earnings' },
      { label: 'Customer Reviews & Feedback', href: '/chef/reviews' },
      { label: 'Kitchen Profile & Settings', href: '/chef/settings' },
    ],
  },
  {
    title: 'Company & Support',
    links: [
      { label: 'About ChefMate', href: '/about' },
      { label: 'Contact Us & Helpline', href: '/contact' },
      { label: 'Frequently Asked Questions', href: '/faq' },
      { label: 'HTML Sitemap', href: '/sitemap' },
    ],
  },
  {
    title: 'Legal & Trust',
    links: [
      { label: 'Terms of Service', href: '/terms' },
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Cookie Policy', href: '/cookies' },
      { label: 'Accessibility Statement', href: '/accessibility' },
    ],
  },
  {
    title: 'Platform Administration',
    links: [
      { label: 'Admin Master Login', href: '/admin/login' },
      { label: 'Platform Operations Overview', href: '/admin' },
      { label: 'Chef Verification Queue', href: '/admin/chefs' },
      { label: 'User Directory & Moderation', href: '/admin/users' },
      { label: 'Global Orders & Disputes', href: '/admin/orders' },
      { label: '1-Link Bank Payout Batches', href: '/admin/payouts' },
      { label: 'Customer Review Moderation', href: '/admin/reviews' },
      { label: 'Automated Quality Flags', href: '/admin/quality' },
      { label: 'Security & Action Audit Logs', href: '/admin/audit-log' },
      { label: 'Marketplace System Settings', href: '/admin/settings' },
    ],
  },
]

export function SitemapPage() {
  return (
    <PublicShell>
      <PageContainer className="py-12 sm:py-20 space-y-12">
        <div className="max-w-2xl space-y-3">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-terracotta block">
            Navigation Directory
          </span>
          <h1 className="font-display text-4xl sm:text-5xl font-bold text-charcoal leading-tight">
            Sitemap
          </h1>
          <p className="text-sm sm:text-base text-charcoal-70 leading-relaxed">
            Complete index of all public discovery routes, customer account services, chef tools, legal policies, and platform operations.
          </p>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {SITEMAP_SECTIONS.map((section) => (
            <div
              key={section.title}
              className="rounded-3xl bg-cream p-6 sm:p-8 border border-charcoal/10 shadow-xs space-y-4"
            >
              <h2 className="font-display text-xl font-bold text-charcoal border-b border-charcoal/10 pb-3">
                {section.title}
              </h2>

              <ul className="space-y-2.5 text-xs sm:text-sm">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      to={link.href}
                      className="text-charcoal-70 hover:text-terracotta hover:underline transition-colors block"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </PageContainer>
    </PublicShell>
  )
}
