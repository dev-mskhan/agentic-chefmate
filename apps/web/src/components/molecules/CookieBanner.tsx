import { useEffect, useState } from 'react'
import { Check, Cookie, SlidersHorizontal, X, ChevronLeft } from 'lucide-react'

const COOKIE_CONSENT_KEY = 'chefmate_cookie_consent'

interface CookiePreferences {
  essential: boolean
  analytics: boolean
  personalization: boolean
  timestamp: number
  dismissed?: boolean
}

export function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false)
  const [showPreferences, setShowPreferences] = useState(false)
  const [analytics, setAnalytics] = useState(true)
  const [personalization, setPersonalization] = useState(true)

  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY)
    if (!consent) {
      // Delay showing banner slightly so it's not jarring on initial page paint
      const timer = window.setTimeout(() => {
        setIsVisible(true)
      }, 1200)
      return () => window.clearTimeout(timer)
    } else {
      try {
        const parsed: CookiePreferences = JSON.parse(consent)
        setAnalytics(parsed.analytics ?? true)
        setPersonalization(parsed.personalization ?? true)
      } catch {
        // ignore parse error
      }
    }
  }, [])

  const saveConsent = (prefs: Partial<CookiePreferences>) => {
    const fullPrefs: CookiePreferences = {
      essential: true,
      analytics: prefs.analytics ?? false,
      personalization: prefs.personalization ?? false,
      timestamp: Date.now(),
      dismissed: prefs.dismissed ?? false,
    }
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(fullPrefs))
    setIsVisible(false)
  }

  const handleAcceptAll = () => {
    saveConsent({ analytics: true, personalization: true })
  }

  const handleEssentialOnly = () => {
    saveConsent({ analytics: false, personalization: false })
  }

  const handleSaveCustom = () => {
    saveConsent({ analytics, personalization })
  }

  const handleDismiss = () => {
    saveConsent({ analytics: false, personalization: false, dismissed: true })
  }

  if (!isVisible) return null

  return (
    <div
      role="region"
      aria-label="Cookie preferences"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 animate-in fade-in slide-in-from-bottom-4 duration-300"
    >
      <div className="rounded-2xl border border-charcoal/15 bg-cream/95 p-4 sm:p-5 shadow-2xl backdrop-blur-md">
        {!showPreferences ? (
          /* ── Compact View ── */
          <div>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-terracotta-10 text-terracotta">
                  <Cookie size={16} />
                </div>
                <div>
                  <p className="text-xs font-bold text-charcoal">Cookie Preferences</p>
                  <p className="text-[11px] text-charcoal-70/80 mt-0.5">
                    We use cookies to ensure food safety standards and personalize meal discovery.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleDismiss}
                aria-label="Dismiss cookie notice"
                className="text-charcoal-70/60 hover:text-charcoal transition-colors p-1"
              >
                <X size={14} />
              </button>
            </div>

            <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-charcoal/8">
              <button
                type="button"
                onClick={() => setShowPreferences(true)}
                className="text-[11px] font-semibold text-charcoal-70 hover:text-terracotta transition-colors flex items-center gap-1 cursor-pointer"
              >
                <SlidersHorizontal size={12} />
                <span>Customize choices</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleEssentialOnly}
                  className="rounded-pill border border-charcoal/15 bg-cream-dim px-3 py-1 text-[11px] font-bold text-charcoal hover:bg-cream transition-colors cursor-pointer"
                >
                  Essential only
                </button>
                <button
                  type="button"
                  onClick={handleAcceptAll}
                  className="rounded-pill bg-terracotta px-3.5 py-1 text-[11px] font-bold text-cream hover:bg-terracotta-dark shadow-2xs transition-colors cursor-pointer"
                >
                  Accept all
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* ── Interactive In-Banner Preferences View ── */
          <div className="space-y-3.5 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-charcoal/8 pb-2.5">
              <button
                type="button"
                onClick={() => setShowPreferences(false)}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-charcoal-70 hover:text-terracotta transition-colors cursor-pointer"
              >
                <ChevronLeft size={14} /> Back
              </button>
              <p className="text-xs font-bold text-charcoal">Customize Preferences</p>
              <button
                type="button"
                onClick={handleDismiss}
                aria-label="Close preferences"
                className="text-charcoal-70/60 hover:text-charcoal transition-colors p-0.5"
              >
                <X size={14} />
              </button>
            </div>

            <div className="space-y-2.5 text-left">
              {/* Essential Cookies */}
              <div className="flex items-start justify-between gap-2.5 rounded-xl bg-cream-dim/60 p-2.5 border border-charcoal/8">
                <div className="flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-[11px] font-bold text-charcoal">Strictly Necessary</p>
                    <span className="text-[9px] font-bold text-sage bg-sage/15 px-1.5 py-0.2 rounded-pill uppercase">
                      Required
                    </span>
                  </div>
                  <p className="text-[10px] text-charcoal-70/80 mt-0.5 leading-snug">
                    Session security, checkout cart retention, and food hygiene verifications.
                  </p>
                </div>
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-sage text-cream">
                  <Check size={12} />
                </div>
              </div>

              {/* Analytics Cookies */}
              <label className="flex items-start justify-between gap-2.5 rounded-xl bg-cream-dim/60 p-2.5 border border-charcoal/8 cursor-pointer hover:border-terracotta/30 transition-colors">
                <div className="flex-1">
                  <p className="text-[11px] font-bold text-charcoal">Analytics & Insights</p>
                  <p className="text-[10px] text-charcoal-70/80 mt-0.5 leading-snug">
                    Anonymous Google Analytics 4 performance metrics to improve discovery.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={analytics}
                  onChange={(e) => setAnalytics(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded accent-terracotta cursor-pointer"
                />
              </label>

              {/* Personalization Cookies */}
              <label className="flex items-start justify-between gap-2.5 rounded-xl bg-cream-dim/60 p-2.5 border border-charcoal/8 cursor-pointer hover:border-terracotta/30 transition-colors">
                <div className="flex-1">
                  <p className="text-[11px] font-bold text-charcoal">Kitchen & City Preferences</p>
                  <p className="text-[10px] text-charcoal-70/80 mt-0.5 leading-snug">
                    Remembers your city filters, dietary choices, and favorite kitchen searches.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={personalization}
                  onChange={(e) => setPersonalization(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded accent-terracotta cursor-pointer"
                />
              </label>
            </div>

            <div className="flex items-center justify-between gap-2 pt-1 border-t border-charcoal/8">
              <button
                type="button"
                onClick={handleEssentialOnly}
                className="text-[11px] font-semibold text-charcoal-70 hover:text-rust transition-colors cursor-pointer"
              >
                Reject optional
              </button>

              <button
                type="button"
                onClick={handleSaveCustom}
                className="rounded-pill bg-terracotta px-4 py-1.5 text-[11px] font-bold text-cream hover:bg-terracotta-dark shadow-2xs transition-colors cursor-pointer"
              >
                Save preferences
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
