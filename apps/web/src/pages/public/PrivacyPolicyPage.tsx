import { PublicShell } from '../../components/templates/PublicShell'
import { PageContainer } from '../../components/templates/PageContainer'

export function PrivacyPolicyPage() {
  return (
    <PublicShell>
      <PageContainer className="py-12 sm:py-20 max-w-4xl space-y-10">
        <div className="space-y-3">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-terracotta block">
            Legal & Compliance
          </span>
          <h1 className="font-display text-4xl sm:text-5xl font-bold text-charcoal leading-tight">
            Privacy Policy
          </h1>
          <p className="text-xs text-charcoal-70">
            Last updated: August 29, 2026 · Effective Date: January 1, 2026
          </p>
        </div>

        <div className="rounded-3xl bg-cream p-8 sm:p-12 border border-charcoal/10 shadow-xs space-y-8 text-xs sm:text-sm leading-relaxed text-charcoal-70">
          <section className="space-y-2">
            <h2 className="font-display text-lg sm:text-xl font-bold text-charcoal">
              1. Overview & Commitment
            </h2>
            <p>
              ChefMate ("we", "our", or "us") is dedicated to protecting the personal privacy and data security of our customers and certified home chefs. This Privacy Policy discloses how we collect, store, utilize, and protect your information when you access our marketplace platform at chefmate.pk and associated mobile surfaces.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-display text-lg sm:text-xl font-bold text-charcoal">
              2. Information We Collect
            </h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong className="text-charcoal">Account & Identity Information:</strong> Full name, email address, phone number, and password hashes created during customer or chef onboarding.
              </li>
              <li>
                <strong className="text-charcoal">Order & Delivery Information:</strong> Delivery addresses, recipient contact numbers, meal dietary preferences, and cooking instructions.
              </li>
              <li>
                <strong className="text-charcoal">Chef Kitchen Data:</strong> National Identity Card (CNIC), home kitchen address, food safety certifications, and bank account settlement details (IBAN).
              </li>
              <li>
                <strong className="text-charcoal">Communication Logs:</strong> Direct order chat messages exchanged between customers and chefs via our integrated chat-service.
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="font-display text-lg sm:text-xl font-bold text-charcoal">
              3. Google Analytics & Automated Tracking
            </h2>
            <p>
              We use <strong>Google Analytics 4 (GA4)</strong> to analyze marketplace traffic patterns, evaluate customer discovery journeys, and measure platform performance. Google Analytics collects anonymous device identifiers, browser types, session durations, and aggregated interaction events (e.g., dish searches, menu view counts, and checkout completions).
            </p>
            <p>
              IP anonymization is enabled by default. Google Analytics does not collect personally identifiable names, unhashed passwords, or payment card details. You can opt out of Google Analytics tracking through your browser settings or by utilizing the official Google Analytics Opt-out Browser Add-on.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-display text-lg sm:text-xl font-bold text-charcoal">
              4. How We Use Your Data
            </h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>To fulfill food orders and coordinate delivery dispatches with your chosen chef.</li>
              <li>To facilitate real-time chat coordination between customer and chef for active orders.</li>
              <li>To disburse chef earnings batches through verified 1-Link bank settlement rails.</li>
              <li>To detect fraudulent activity, abusive reviews, and food safety quality flags.</li>
              <li>To send order status notifications, receipts, and optional newsletter updates.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="font-display text-lg sm:text-xl font-bold text-charcoal">
              5. Data Security & Storage
            </h2>
            <p>
              All customer communications and sensitive account tokens are encrypted in transit via Transport Layer Security (TLS 1.3) and at rest using AES-256 standard encryption. We never store raw payment card credentials on our servers; payments are processed securely through certified gateway partners.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-display text-lg sm:text-xl font-bold text-charcoal">
              6. Your Privacy Rights & Contact
            </h2>
            <p>
              You have the right to inspect, correct, export, or request the deletion of your personal data at any time. For privacy inquiries or data erasure requests, please email our Data Protection Officer at <strong className="text-charcoal">privacy@chefmate.pk</strong>.
            </p>
          </section>
        </div>
      </PageContainer>
    </PublicShell>
  )
}
