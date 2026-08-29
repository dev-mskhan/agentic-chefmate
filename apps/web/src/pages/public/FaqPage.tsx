import { useState } from 'react'
import { ChevronDown, ChevronUp, HelpCircle, Search } from 'lucide-react'
import { PublicShell } from '../../components/templates/PublicShell'
import { PageContainer } from '../../components/templates/PageContainer'

interface FaqItem {
  question: string
  answer: string
  category: string
}

const FAQS: FaqItem[] = [
  {
    category: 'Ordering & Delivery',
    question: 'How do I order from a home chef on ChefMate?',
    answer:
      'Search chefs or dishes in your city, select your desired portion quantity and scheduled delivery date, add any custom cooking instructions (such as spice level or allergy notes), and complete checkout online or via Cash on Delivery.',
  },
  {
    category: 'Ordering & Delivery',
    question: 'What is the delivery timeline for home-cooked meals?',
    answer:
      'Unlike fast-food restaurants that reheat premade inventory, ChefMate chefs prepare dishes slowly in small batches. Most chefs require a 2 to 4-hour advance booking or scheduled day-ahead delivery so they can procure fresh ingredients.',
  },
  {
    category: 'Ordering & Delivery',
    question: 'Can I cancel my order or request a refund?',
    answer:
      'Orders in PENDING or CONFIRMED status can be cancelled directly from your Order Details page for an immediate full refund. Once a chef starts PREPARING the dish, cancellation is closed to prevent food wastage.',
  },
  {
    category: 'Food Safety & Kitchen Standards',
    question: 'How does ChefMate verify home kitchen hygiene?',
    answer:
      'Every home chef undergoes a mandatory multi-step verification process including Punjab/Sindh Food Authority food handler registration, kitchen safety inspections, tasting trials, and ingredient sourcing audits before their menu is published.',
  },
  {
    category: 'Food Safety & Kitchen Standards',
    question: 'Are allergens clearly marked on dish menus?',
    answer:
      'Yes. Every dish page lists complete ingredients, common allergens (dairy, nuts, gluten, seafood), and spice levels. You can also chat directly with your chef to customize preparation.',
  },
  {
    category: 'Meal Plan Subscriptions',
    question: 'How do recurring meal plans work?',
    answer:
      'Meal plans allow you to subscribe to weekly, biweekly, or monthly dinner dastarkhwans from your favorite local chef. You choose your delivery days, and the chef prepares a curated rotating menu. You can pause, skip, or cancel your subscription at any time.',
  },
  {
    category: 'For Chefs',
    question: 'How do I start cooking on ChefMate?',
    answer:
      'Apply via our Chef Onboarding portal (/chef/onboarding). Submit your kitchen details, signature dishes, CNIC, and hygiene certificate. Our culinary audit team will visit for a kitchen inspection and food tasting within 3 to 5 business days.',
  },
  {
    category: 'For Chefs',
    question: 'What platform fee does ChefMate charge chefs?',
    answer:
      'Chefs keep 90% of every order. ChefMate charges a transparent 10% platform service fee to cover payment processing, courier coordination, customer support, and marketing.',
  },
]

const CATEGORIES = ['All', 'Ordering & Delivery', 'Food Safety & Kitchen Standards', 'Meal Plan Subscriptions', 'For Chefs']

export function FaqPage() {
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  const filteredFaqs = FAQS.filter((faq) => {
    const matchesCategory = selectedCategory === 'All' || faq.category === selectedCategory
    const q = searchQuery.toLowerCase()
    const matchesSearch =
      faq.question.toLowerCase().includes(q) || faq.answer.toLowerCase().includes(q)
    return matchesCategory && matchesSearch
  })

  return (
    <PublicShell>
      <PageContainer className="py-12 sm:py-20 space-y-12">
        <div className="max-w-2xl space-y-3">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-terracotta block">
            Help Center & Answers
          </span>
          <h1 className="font-display text-4xl sm:text-5xl font-bold text-charcoal leading-tight">
            Frequently asked questions
          </h1>
          <p className="text-sm sm:text-base text-charcoal-70 leading-relaxed">
            Find immediate answers on ordering, food hygiene standards, chef certification, and meal plans.
          </p>

          {/* Search bar */}
          <div className="pt-4 max-w-lg">
            <div className="flex items-center gap-2.5 rounded-2xl bg-cream p-3 border border-charcoal/15 shadow-xs text-xs sm:text-sm">
              <Search size={16} className="text-terracotta shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search questions (e.g. hygiene, delivery, cancel)..."
                className="w-full bg-transparent text-charcoal outline-none placeholder:text-charcoal-70/60"
              />
            </div>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-pill text-xs font-bold transition-all ${
                selectedCategory === cat
                  ? 'bg-terracotta text-cream shadow-xs'
                  : 'bg-cream-dim text-charcoal-70 hover:bg-cream border border-charcoal/10'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* FAQ Accordion List */}
        <div className="space-y-3 max-w-3xl">
          {filteredFaqs.length === 0 ? (
            <div className="rounded-3xl bg-cream p-8 text-center border border-charcoal/10 space-y-2">
              <HelpCircle size={28} className="mx-auto text-charcoal-70/50" />
              <p className="text-sm font-bold text-charcoal">No questions found</p>
              <p className="text-xs text-charcoal-70">
                Try searching for a different keyword or browse all categories.
              </p>
            </div>
          ) : (
            filteredFaqs.map((faq, index) => {
              const isOpen = openIndex === index
              return (
                <div
                  key={faq.question}
                  className="rounded-3xl bg-cream border border-charcoal/10 overflow-hidden shadow-2xs transition-all"
                >
                  <button
                    type="button"
                    onClick={() => setOpenIndex(isOpen ? null : index)}
                    className="w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 font-display text-base sm:text-lg font-bold text-charcoal hover:text-terracotta transition-colors"
                  >
                    <span>{faq.question}</span>
                    <span className="shrink-0 text-charcoal-70">
                      {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </span>
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-5 sm:px-6 sm:pb-6 text-xs sm:text-sm leading-relaxed text-charcoal-70 border-t border-charcoal/5 pt-3 animate-in fade-in">
                      {faq.answer}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </PageContainer>
    </PublicShell>
  )
}
