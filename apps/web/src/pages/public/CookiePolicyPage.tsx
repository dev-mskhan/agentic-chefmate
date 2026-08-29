import { PublicShell } from '../../components/templates/PublicShell'
import { PageContainer } from '../../components/templates/PageContainer'

export function CookiePolicyPage() {
  return (
    <PublicShell>
      <PageContainer className="py-12 sm:py-20 max-w-4xl space-y-10">
        <div className="space-y-3">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-terracotta block">
            Legal & Compliance
          </span>
          <h1 className="font-display text-4xl sm:text-5xl font-bold text-charcoal leading-tight">
            Cookie Policy
          </h1>
          <p className="text-xs text-charcoal-70">
            Last updated: August 29, 2026 · Effective Date: January 1, 2026
          </p>
        </div>

        <div className="rounded-3xl bg-cream p-8 sm:p-12 border border-charcoal/10 shadow-xs space-y-8 text-xs sm:text-sm leading-relaxed text-charcoal-70">
          <section className="space-y-2">
            <h2 className="font-display text-lg sm:text-xl font-bold text-charcoal">
              1. What Are Cookies?
            </h2>
            <p>
              Cookies are small data text files placed on your device (computer, smartphone, or tablet) when you visit websites. They are widely used to make web platforms function efficiently, retain session preferences, and provide analytical data to website operators.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="font-display text-lg sm:text-xl font-bold text-charcoal">
              2. Cookies We Use on ChefMate
            </h2>

            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-cream-dim/60 border border-charcoal/8 space-y-1">
                <strong className="text-charcoal block text-xs sm:text-sm">A. Strictly Necessary & Essential Cookies</strong>
                <p className="text-xs">
                  These cookies are vital for the core functionality of ChefMate. They maintain your authenticated sign-in session, remember items in your single-chef shopping basket, and ensure secure token transmission. These cannot be switched off.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-cream-dim/60 border border-charcoal/8 space-y-1">
                <strong className="text-charcoal block text-xs sm:text-sm">B. Performance & Analytics Cookies (Google Analytics)</strong>
                <p className="text-xs">
                  We use Google Analytics 4 cookies (such as <code className="text-terracotta">_ga</code> and <code className="text-terracotta">_ga_*</code>) to understand aggregate user behavior, popular dishes, search queries, and conversion flows. All data is collected in pseudonymized form with IP masking.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-cream-dim/60 border border-charcoal/8 space-y-1">
                <strong className="text-charcoal block text-xs sm:text-sm">C. Preference & Functional Cookies</strong>
                <p className="text-xs">
                  These cookies remember your selected city filter (e.g. Lahore vs. Karachi), language preferences, and recent search keywords for a faster discovery experience.
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="font-display text-lg sm:text-xl font-bold text-charcoal">
              3. Managing & Opting Out of Cookies
            </h2>
            <p>
              Most web browsers automatically accept cookies, but you can adjust your browser settings to decline cookies or prompt you before accepting a cookie. Note that disabling essential cookies may impact checkout functionality and session persistence.
            </p>
          </section>
        </div>
      </PageContainer>
    </PublicShell>
  )
}
