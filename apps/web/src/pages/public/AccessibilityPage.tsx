import { PublicShell } from '../../components/templates/PublicShell'
import { PageContainer } from '../../components/templates/PageContainer'

export function AccessibilityPage() {
  return (
    <PublicShell>
      <PageContainer className="py-12 sm:py-20 max-w-4xl space-y-10">
        <div className="space-y-3">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-terracotta block">
            Inclusion & Usability
          </span>
          <h1 className="font-display text-4xl sm:text-5xl font-bold text-charcoal leading-tight">
            Accessibility Statement
          </h1>
          <p className="text-xs text-charcoal-70">
            Last updated: August 29, 2026 · Target: WCAG 2.1 Level AA Standard
          </p>
        </div>

        <div className="rounded-3xl bg-cream p-8 sm:p-12 border border-charcoal/10 shadow-xs space-y-8 text-xs sm:text-sm leading-relaxed text-charcoal-70">
          <section className="space-y-2">
            <h2 className="font-display text-lg sm:text-xl font-bold text-charcoal">
              1. Our Accessibility Commitment
            </h2>
            <p>
              ChefMate is committed to ensuring that our digital marketplace is accessible to all individuals, including people with visual, motor, auditory, and cognitive disabilities. We continually review and improve our web platform to conform to the <strong>Web Content Accessibility Guidelines (WCAG) 2.1 Level AA</strong>.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-display text-lg sm:text-xl font-bold text-charcoal">
              2. Core Accessibility Features Implemented
            </h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong className="text-charcoal">Full Keyboard Navigation:</strong> All interactive elements, menus, search inputs, dropdowns, and modals can be navigated using standard keyboard tabs, arrow keys, and Escape shortcuts with visible focus indicators.
              </li>
              <li>
                <strong className="text-charcoal">Reduced Motion Respect:</strong> All GSAP animations, hero reveals, parallax scrubs, and split-word headlines detect and respect the user's OS-level <code className="text-terracotta">prefers-reduced-motion</code> setting, rendering instant static layouts.
              </li>
              <li>
                <strong className="text-charcoal">High-Contrast Color Tokens:</strong> Our "Warm Hearth" color palette is calibrated to exceed minimum contrast ratios (4.5:1 for body copy and 3:1 for large display headings) against cream and espresso backgrounds.
              </li>
              <li>
                <strong className="text-charcoal">Screen Reader Optimization:</strong> Form controls feature explicit accessible labels, dynamic content updates use ARIA live regions, and food images provide descriptive alternative text.
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="font-display text-lg sm:text-xl font-bold text-charcoal">
              3. Feedback & Assistance
            </h2>
            <p>
              We welcome your feedback on the accessibility of ChefMate. If you encounter any accessibility barrier or have suggestions for improvement, please contact us at <strong className="text-charcoal">accessibility@chefmate.pk</strong>.
            </p>
          </section>
        </div>
      </PageContainer>
    </PublicShell>
  )
}
