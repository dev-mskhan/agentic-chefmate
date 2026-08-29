import { PublicShell } from '../../components/templates/PublicShell'
import { PageContainer } from '../../components/templates/PageContainer'

export function TermsPage() {
  return (
    <PublicShell>
      <PageContainer className="py-12 sm:py-20 max-w-4xl space-y-10">
        <div className="space-y-3">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-terracotta block">
            Legal & Compliance
          </span>
          <h1 className="font-display text-4xl sm:text-5xl font-bold text-charcoal leading-tight">
            Terms of Service
          </h1>
          <p className="text-xs text-charcoal-70">
            Last updated: August 29, 2026 · Effective Date: January 1, 2026
          </p>
        </div>

        <div className="rounded-3xl bg-cream p-8 sm:p-12 border border-charcoal/10 shadow-xs space-y-8 text-xs sm:text-sm leading-relaxed text-charcoal-70">
          <section className="space-y-2">
            <h2 className="font-display text-lg sm:text-xl font-bold text-charcoal">
              1. Marketplace Platform Relationship
            </h2>
            <p>
              ChefMate provides a digital technology platform that connects independent verified home chefs ("Chefs") with individuals seeking home-cooked meals and recurring meal plans ("Customers"). ChefMate facilitates catalog discovery, order placement, secure payments, and direct messaging. Chefs operate as independent culinary entrepreneurs and are not employees or franchisees of ChefMate.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-display text-lg sm:text-xl font-bold text-charcoal">
              2. Ordering & Payment Terms
            </h2>
            <p>
              When a Customer places an order, the transaction forms a binding agreement between the Customer and the selected Chef. Prices are quoted in Pakistani Rupees (PKR) and include all applicable dish ingredients, packaging, and platform service fees. Customers may pay via accepted digital credit/debit cards or Cash on Delivery where supported.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-display text-lg sm:text-xl font-bold text-charcoal">
              3. Order Cancellations & Refunds
            </h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong className="text-charcoal">Pre-Cooking Cancellation:</strong> Customers may cancel orders free of charge while in PENDING or CONFIRMED status for an immediate full refund.
              </li>
              <li>
                <strong className="text-charcoal">Preparation Stage:</strong> Once the Chef begins PREPARING the meal, cancellation is locked to prevent ingredient wastage.
              </li>
              <li>
                <strong className="text-charcoal">Quality Disputes & Spoilage:</strong> If a delivered meal violates hygiene standards, contains unlisted allergens, or suffers transit damage, Customers may lodge a dispute within 4 hours of delivery for administrative refund review.
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="font-display text-lg sm:text-xl font-bold text-charcoal">
              4. Chef Standards & Food Safety Obligations
            </h2>
            <p>
              All Chefs on ChefMate agree to strictly uphold food hygiene requirements established by regional food authorities (including the Punjab Food Authority and Sindh Food Authority). Chefs certify that they prepare dishes in sanitary home kitchens, maintain personal hygiene, store ingredients at proper temperatures, and accurately disclose all recipe ingredients and allergen warnings.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-display text-lg sm:text-xl font-bold text-charcoal">
              5. Platform Commission & Payouts
            </h2>
            <p>
              ChefMate retains a 10% platform commission on completed order volume to support software maintenance, payment processing, customer care, and courier logistics. Chef disbursements are executed on a weekly settlement cycle directly into verified IBAN accounts.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-display text-lg sm:text-xl font-bold text-charcoal">
              6. Communication Standards & Direct Chat
            </h2>
            <p>
              The integrated chat service is provided solely for coordinating meal prep instructions, dietary preferences, and delivery updates. Unsolicited marketing, off-platform solicitation, harassment, or abusive language will result in immediate account suspension.
            </p>
          </section>
        </div>
      </PageContainer>
    </PublicShell>
  )
}
