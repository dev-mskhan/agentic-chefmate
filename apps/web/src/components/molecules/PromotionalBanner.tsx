import { useState } from 'react'
import { Sparkles, Check, Copy } from 'lucide-react'

interface PromotionalBannerProps {
  code?: string
  title?: string
  description?: string
}

export function PromotionalBanner({
  code = 'WELCOME10',
  title = 'Special Home Kitchen Offer',
  description = 'Get 10% off your first order from this chef using promo code at checkout.',
}: PromotionalBannerProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-r from-terracotta via-terracotta-dark to-espresso p-6 text-cream shadow-lg sm:p-8 border border-cream/15">
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-6">
        <div className="max-w-xl space-y-2">
          <div className="flex items-center gap-2 text-saffron">
            <Sparkles className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-[0.2em]">{title}</span>
          </div>
          <h3 className="font-display text-2xl sm:text-3xl text-cream leading-tight">
            Save 10% on your home-cooked meal today
          </h3>
          <p className="text-sm leading-6 text-cream/80">{description}</p>
        </div>

        <div className="flex items-center gap-3 rounded-2xl bg-cream/10 p-3.5 backdrop-blur-md border border-cream/20 shrink-0">
          <div className="text-right">
            <span className="block text-[10px] uppercase tracking-wider text-cream/70">Promo Code</span>
            <span className="font-mono text-lg font-bold text-saffron tracking-wider">{code}</span>
          </div>
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 rounded-pill bg-saffron px-4 py-2 text-xs font-bold text-charcoal hover:bg-saffron/90 transition-all shadow-sm"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5" /> Copied
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" /> Copy Code
              </>
            )}
          </button>
        </div>
      </div>

      {/* Decorative ambient background blur */}
      <div className="pointer-events-none absolute -right-10 -bottom-10 h-40 w-40 rounded-full bg-saffron/20 blur-3xl" />
      <div className="pointer-events-none absolute -left-10 -top-10 h-40 w-40 rounded-full bg-terracotta/30 blur-3xl" />
    </div>
  )
}
