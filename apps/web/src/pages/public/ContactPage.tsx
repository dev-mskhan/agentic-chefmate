import { useState, type FormEvent } from 'react'
import { CheckCircle2, Mail, MapPin, MessageSquare, Phone, Send } from 'lucide-react'
import { PublicShell } from '../../components/templates/PublicShell'
import { PageContainer } from '../../components/templates/PageContainer'
import { Button } from '../../components/atoms/Button'
import { Dropdown } from '../../components/atoms/Dropdown'

const CATEGORY_OPTIONS = [
  { value: 'GENERAL', label: 'General Inquiry' },
  { value: 'ORDER', label: 'Active Order & Delivery' },
  { value: 'CHEF_INQUIRY', label: 'Become a Chef / Kitchen Certification' },
  { value: 'FEEDBACK', label: 'Feedback & Suggestions' },
]

export function ContactPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [category, setCategory] = useState<'GENERAL' | 'ORDER' | 'CHEF_INQUIRY' | 'FEEDBACK'>('GENERAL')
  const [orderNumber, setOrderNumber] = useState('')
  const [message, setMessage] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!name || !email || !message) return

    setSubmitting(true)
    setTimeout(() => {
      setSubmitting(false)
      setSubmitted(true)
    }, 600)
  }

  return (
    <PublicShell>
      <PageContainer className="py-12 sm:py-20 space-y-12">
        <div className="max-w-2xl space-y-3">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-terracotta block">
            Customer & Chef Support
          </span>
          <h1 className="font-display text-4xl sm:text-5xl font-bold text-charcoal leading-tight">
            How can we assist you?
          </h1>
          <p className="text-sm sm:text-base text-charcoal-70 leading-relaxed">
            Have questions regarding an active meal order, dietary preferences, or kitchen onboarding? Our neighborhood support team responds within 2 business hours.
          </p>
        </div>

        <div className="grid gap-12 lg:grid-cols-[1.2fr_0.8fr] items-start">
          {/* Left Form */}
          <div className="rounded-3xl bg-cream p-6 sm:p-10 border border-charcoal/10 shadow-sm space-y-6">
            {submitted ? (
              <div className="py-12 text-center space-y-4 animate-in fade-in">
                <div className="w-16 h-16 rounded-full bg-sage/20 text-sage mx-auto flex items-center justify-center">
                  <CheckCircle2 size={32} />
                </div>
                <h3 className="font-display text-2xl font-bold text-charcoal">
                  Message received!
                </h3>
                <p className="text-xs sm:text-sm text-charcoal-70 max-w-md mx-auto leading-relaxed">
                  Thank you for reaching out, {name}. A support specialist has received your inquiry and will reply to <strong className="text-charcoal">{email}</strong> shortly.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSubmitted(false)
                    setMessage('')
                  }}
                  className="mt-4 px-6 py-2.5 rounded-pill bg-terracotta text-cream text-xs font-bold hover:bg-terracotta-dark transition-colors"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-charcoal block">Your Full Name *</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Zainab Ahmed"
                      className="w-full rounded-2xl bg-cream-dim/80 px-4 py-3 text-xs sm:text-sm border border-charcoal/10 outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-charcoal block">Email Address *</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. zainab@example.com"
                      className="w-full rounded-2xl bg-cream-dim/80 px-4 py-3 text-xs sm:text-sm border border-charcoal/10 outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-charcoal block">Inquiry Category</label>
                    <Dropdown
                      value={category}
                      onChange={(val) => setCategory(val as any)}
                      options={CATEGORY_OPTIONS}
                      className="py-3 rounded-2xl bg-cream-dim/80 border-charcoal/10"
                    />
                  </div>

                  {category === 'ORDER' && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-charcoal block">Order # (Optional)</label>
                      <input
                        type="text"
                        value={orderNumber}
                        onChange={(e) => setOrderNumber(e.target.value)}
                        placeholder="e.g. ORD-2026-881"
                        className="w-full rounded-2xl bg-cream-dim/80 px-4 py-3 text-xs sm:text-sm border border-charcoal/10 outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta"
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-charcoal block">Message *</label>
                  <textarea
                    required
                    rows={5}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Describe your inquiry or question in detail..."
                    className="w-full rounded-2xl bg-cream-dim/80 px-4 py-3 text-xs sm:text-sm border border-charcoal/10 outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta resize-none"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full sm:w-auto px-8 py-3 text-xs font-bold gap-2"
                >
                  <Send size={14} />
                  {submitting ? 'Sending inquiry...' : 'Send Message'}
                </Button>
              </form>
            )}
          </div>

          {/* Right Contact Info Channels */}
          <aside className="space-y-6">
            <div className="rounded-3xl bg-cream p-6 sm:p-8 border border-charcoal/10 shadow-xs space-y-6">
              <h3 className="font-display text-xl font-bold text-charcoal">
                Direct Channels
              </h3>

              <div className="space-y-4 text-xs sm:text-sm">
                <div className="flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-xl bg-terracotta-10 text-terracotta flex items-center justify-center shrink-0">
                    <Phone size={16} />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-charcoal-70 block">WhatsApp Helpline</span>
                    <strong className="text-charcoal block mt-0.5">+92 (42) 3578-9900</strong>
                    <span className="text-[11px] text-charcoal-70">Mon – Sun, 9:00 AM – 10:00 PM PKT</span>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-xl bg-terracotta-10 text-terracotta flex items-center justify-center shrink-0">
                    <Mail size={16} />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-charcoal-70 block">Support Desk</span>
                    <strong className="text-charcoal block mt-0.5">support@chefmate.pk</strong>
                    <span className="text-[11px] text-charcoal-70">For order inquiries & refunds</span>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-xl bg-terracotta-10 text-terracotta flex items-center justify-center shrink-0">
                    <MessageSquare size={16} />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-charcoal-70 block">Chef Onboarding</span>
                    <strong className="text-charcoal block mt-0.5">kitchens@chefmate.pk</strong>
                    <span className="text-[11px] text-charcoal-70">Kitchen audits & licensing</span>
                  </div>
                </div>

                <div className="flex items-start gap-3.5 border-t border-charcoal/10 pt-4">
                  <div className="w-9 h-9 rounded-xl bg-terracotta-10 text-terracotta flex items-center justify-center shrink-0">
                    <MapPin size={16} />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-charcoal-70 block">Headquarters</span>
                    <strong className="text-charcoal block mt-0.5">Gulberg III, Lahore</strong>
                    <span className="text-[11px] text-charcoal-70">Hub 2: Clifton Block 4, Karachi</span>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </PageContainer>
    </PublicShell>
  )
}
