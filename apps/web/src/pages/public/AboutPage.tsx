import { Link } from 'react-router-dom'
import { CheckCircle2, Heart, ShieldCheck, Users, Utensils } from 'lucide-react'
import { PublicShell } from '../../components/templates/PublicShell'
import { PageContainer } from '../../components/templates/PageContainer'
import { SectionReveal } from '../../components/motion/SectionReveal'
import { SplitHeadline } from '../../components/motion/SplitHeadline'

const PILLARS = [
  {
    icon: ShieldCheck,
    title: 'Certified Kitchen Hygiene',
    desc: 'Every home kitchen on ChefMate undergoes mandatory in-person inspections, food safety certifications, and ingredient quality audits before opening for orders.',
  },
  {
    icon: Heart,
    title: 'Zero Mass-Industrial Additives',
    desc: 'No synthetic flavor enhancers or commercial restaurant bases. Dishes are cooked with unadulterated cold-pressed oils, fresh spices, and slow-simmered handi traditions.',
  },
  {
    icon: Users,
    title: 'Direct Chef Economic Empowerment',
    desc: 'Chefs keep 90% of every order. We eliminate exploitative commercial middleman margins so culinary artisans can build thriving independent livelihoods from home.',
  },
  {
    icon: Utensils,
    title: 'Small-Batch Freshness',
    desc: 'Food is never batch-frozen or reheated. Each dish is prepared on demand specifically for your scheduled delivery window.',
  },
]

export function AboutPage() {
  return (
    <PublicShell>
      <PageContainer className="py-12 sm:py-20 space-y-16">
        {/* Hero Banner */}
        <div className="max-w-3xl space-y-4">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-terracotta block">
            Our Purpose & Culinary Heritage
          </span>

          <SplitHeadline
            text="Real home cooking, restored to neighborhood tables."
            className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-charcoal leading-[0.98] tracking-tight"
          />

          <p className="text-base sm:text-lg text-charcoal-70 leading-relaxed pt-2">
            ChefMate was founded to bridge the gap between talented neighborhood cooks and households seeking wholesome, uncompromised meals. We believe the best food is made slowly, with family recipes that have been refined across generations.
          </p>
        </div>

        {/* Story Mosaic */}
        <SectionReveal start="top 80%">
          <div className="grid gap-8 lg:grid-cols-2 items-center rounded-3xl bg-cream-dim p-8 sm:p-12 border border-charcoal/10 shadow-sm">
            <div className="space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-saffron block">
                The ChefMate Standard
              </span>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-charcoal">
                From their home hearth to your family dastarkhwan.
              </h2>
              <p className="text-sm text-charcoal-70 leading-relaxed">
                Modern food delivery prioritizes speed and industrial mass-preparation. In contrast, ChefMate champions artisanal small-batch kitchens. When you order from Chef Ayesha in Lahore or Chef Hamza in Karachi, you know exactly who sourced the ingredients, hand-pounded the spices, and sealed your clay pot.
              </p>

              <div className="pt-2 flex flex-wrap gap-2 text-xs font-bold text-charcoal">
                <span className="px-3.5 py-1.5 rounded-pill bg-cream border border-charcoal/10 flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-sage" /> Punjab Food Authority Audited
                </span>
                <span className="px-3.5 py-1.5 rounded-pill bg-cream border border-charcoal/10 flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-sage" /> Sindh Food Authority Registered
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <img
                src="https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=600&q=80"
                alt="Chef seasoning food"
                className="h-56 sm:h-72 w-full rounded-2xl object-cover shadow-sm"
              />
              <img
                src="https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=600&q=80"
                alt="Slow cooked home meal"
                className="h-56 sm:h-72 w-full rounded-2xl object-cover shadow-sm mt-6"
              />
            </div>
          </div>
        </SectionReveal>

        {/* 4 Pillars Grid */}
        <div className="space-y-8">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-terracotta block">
              Guiding Commitments
            </span>
            <h2 className="font-display text-3xl font-bold text-charcoal mt-1">
              Why ChefMate is different
            </h2>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {PILLARS.map((p) => {
              const Icon = p.icon
              return (
                <div
                  key={p.title}
                  className="rounded-3xl bg-cream p-6 border border-charcoal/10 shadow-xs space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="w-10 h-10 rounded-2xl bg-terracotta-10 flex items-center justify-center text-terracotta">
                      <Icon size={20} />
                    </div>
                    <h3 className="font-display text-lg font-bold text-charcoal">{p.title}</h3>
                    <p className="text-xs text-charcoal-70 leading-relaxed">{p.desc}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* CTA Strip */}
        <div className="rounded-3xl bg-espresso p-8 sm:p-12 text-cream flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl">
          <div className="space-y-2 text-center sm:text-left">
            <h3 className="font-display text-2xl sm:text-3xl font-bold">
              Ready to taste real home cooking?
            </h3>
            <p className="text-xs sm:text-sm text-cream/70 max-w-md">
              Discover certified independent chefs in your neighborhood or join our culinary community as a certified cook.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Link
              to="/discover"
              className="px-6 py-3 rounded-pill bg-saffron text-charcoal text-xs font-bold hover:bg-saffron/90 shadow-md transition-colors"
            >
              Explore Dishes
            </Link>
            <Link
              to="/chef/onboarding"
              className="px-6 py-3 rounded-pill bg-cream/15 text-cream text-xs font-bold hover:bg-cream/25 border border-cream/20 transition-colors"
            >
              Cook with Us →
            </Link>
          </div>
        </div>
      </PageContainer>
    </PublicShell>
  )
}
