import { useEffect, useRef, useState, type FormEvent } from 'react'
import gsap from 'gsap'
import { useNavigate } from 'react-router-dom'
import {
  MapPin,
  Search,
  UtensilsCrossed,
} from 'lucide-react'
import { Dropdown } from '../atoms/Dropdown'

function getPakistanTime() {
  const now = new Date()
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Karachi',
    hour: 'numeric',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now)
  const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? 0)
  const timeLabel = new Intl.DateTimeFormat('en-PK', {
    timeZone: 'Asia/Karachi',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(now)

  if (hour < 12) return { periodLabel: 'Good morning', note: 'Slow meals simmering.', timeLabel }
  if (hour < 17) return { periodLabel: 'Good afternoon', note: 'Dinner from home chefs.', timeLabel }
  return { periodLabel: 'Good evening', note: 'Slow comfort food tonight.', timeLabel }
}

const heroCards = [
  {
    image: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1200&q=85',
    alt: 'Colorful home-cooked meal on a dining table',
    label: 'Lahore Kitchens',
    title: 'Smoky Karahi',
  },
  {
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1200&q=85',
    alt: 'Fresh seasonal bowl with colorful vegetables',
    label: 'Karachi Kitchens',
    title: 'Sindhi Pulao',
  },
  {
    image: 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=1200&q=85',
    alt: 'Fresh vegetables prepared for dinner',
    label: 'Islamabad Kitchens',
    title: 'Garden Daal',
  },
]

const QUICK_TAGS = [
  { label: 'Karahi', query: 'karahi' },
  { label: 'Biryani', query: 'biryani' },
  { label: 'Daal', query: 'daal' },
  { label: 'Nihari', query: 'nihari' },
]

const CITY_OPTIONS = [
  { value: 'All Cities', label: 'All Cities' },
  { value: 'Lahore', label: 'Lahore' },
  { value: 'Karachi', label: 'Karachi' },
  { value: 'Islamabad', label: 'Islamabad' },
  { value: 'Rawalpindi', label: 'Rawalpindi' },
]

export function HeroSection() {
  const navigate = useNavigate()
  const heroRef = useRef<HTMLElement>(null)
  const cardRefs = useRef<(HTMLDivElement | null)[]>([])
  const activeCardRef = useRef(0)
  const [activeCard, setActiveCard] = useState(0)
  const [pakistanTime, setPakistanTime] = useState(() => getPakistanTime())
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCity, setSelectedCity] = useState('All Cities')

  const handleHeroSearch = (e: FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams()
    if (searchQuery.trim()) params.set('q', searchQuery.trim())
    if (selectedCity && selectedCity !== 'All Cities') params.set('city', selectedCity)
    navigate(`/discover?${params.toString()}`)
  }

  // Card rotation and entrance animations
  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let cancelled = false
    let rotationTimer: number | undefined
    let revertContext: (() => void) | undefined
    const clockTimer = window.setInterval(() => setPakistanTime(getPakistanTime()), 60000)

    document.fonts.ready.then(() => {
      if (cancelled) return
      const context = gsap.context(() => {
        if (reduceMotion) {
          gsap.set(
            '.hero-kicker, .hero-copy, .hero-search-box, .hero-actions, .hero-visual, .hero-trust, .hero-title-main',
            { opacity: 1, clearProps: 'transform,clipPath' },
          )
          return
        }

        gsap
          .timeline({ defaults: { ease: 'power3.out' } })
          .from('.hero-kicker', { opacity: 0, y: 16, duration: 0.45 })
          .from('.hero-title-main', { opacity: 0, y: 22, duration: 0.6 }, '-=0.25')
          .from(
            '.hero-copy, .hero-search-box, .hero-actions, .hero-trust',
            { opacity: 0, y: 18, duration: 0.5, stagger: 0.08 },
            '-=0.2',
          )
          .from(
            '.hero-visual',
            { opacity: 0, scale: 0.94, duration: 0.8, ease: 'expo.out' },
            '-=0.4',
          )

        // Floating time badge subtle bob
        gsap.to('.hero-float', {
          y: -6,
          duration: 3,
          ease: 'sine.inOut',
          repeat: -1,
          yoyo: true,
        })

        // Ambient Steam Wave Loop
        gsap.to('.steam-wave', {
          y: -10,
          opacity: 0,
          duration: 2.4,
          ease: 'sine.inOut',
          repeat: -1,
          stagger: { each: 0.5, repeat: -1 },
        })
      }, heroRef)
      revertContext = () => context.revert()

      // Card Stack Rotation
      rotationTimer = window.setInterval(() => {
        const currentIndex = activeCardRef.current
        const nextIndex = (currentIndex + 1) % heroCards.length
        const current = cardRefs.current[currentIndex]
        const next = cardRefs.current[nextIndex]
        if (!current || !next) return
        gsap
          .timeline({ defaults: { overwrite: 'auto' } })
          .set(next, { zIndex: '3' })
          .set(current, { zIndex: '1' }, '<')
          .to(current, {
            x: 28,
            y: 20,
            rotate: -3,
            scale: 0.90,
            opacity: 0.94,
            duration: 0.95,
            ease: 'power3.inOut',
          })
          .to(
            next,
            { x: 0, y: 0, rotate: 0, scale: 1, opacity: 1, duration: 1.0, ease: 'expo.out' },
            '<0.08',
          )
          .then(() => {
            const remaining = cardRefs.current.find(
              (card) => card && card !== current && card !== next,
            )
            if (remaining) remaining.style.zIndex = '2'
            activeCardRef.current = nextIndex
            setActiveCard(activeCardRef.current)
          })
      }, 4500)
    })

    return () => {
      cancelled = true
      revertContext?.()
      if (rotationTimer) window.clearInterval(rotationTimer)
      window.clearInterval(clockTimer)
    }
  }, [])

  return (
    <section
      ref={heroRef}
      className="relative mx-auto max-w-[1500px] px-4 pb-14 pt-8 sm:px-8 sm:pb-18 sm:pt-12 md:pb-20 md:pt-14 lg:px-12 lg:pb-24 lg:pt-16 2xl:px-16"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1.1fr_0.9fr] xl:grid-cols-[1.15fr_0.85fr] items-center gap-10 md:gap-8 lg:gap-14 xl:gap-20">
        {/* ── Left Column: Headline, Subtitle, Search ── */}
        <div className="relative z-20 w-full max-w-2xl lg:max-w-3xl">
          {/* Kicker badge */}
          <div className="hero-kicker inline-flex items-center gap-2 px-3 py-1 rounded-pill bg-cream-dim border border-charcoal/10 text-xs font-semibold text-terracotta mb-4 sm:mb-5 shadow-2xs">
            <UtensilsCrossed size={13} className="text-terracotta" />
            <span className="uppercase tracking-[0.18em] text-[10.5px] font-bold">
              Fresh from neighborhood kitchens
            </span>
          </div>

          {/* ── Editorial Headline: Clean, Natural, Never Clipped ── */}
          <div className="hero-title-main">
            <h1 className="font-display text-[clamp(2.75rem,2rem+3.8vw,5.5rem)] leading-[1.04] sm:leading-[1.06] tracking-[-0.035em] font-bold text-charcoal">
              Good food.
              <span className="block text-terracotta italic font-normal mt-1">
                Made near you.
              </span>
            </h1>
          </div>

          <p className="hero-copy mt-5 max-w-xl text-base sm:text-lg md:text-base lg:text-lg leading-relaxed text-charcoal-70">
            Discover verified independent home chefs in your city. Slow-cooked, small-batch comfort food delivered fresh to your dining table.
          </p>

          {/* ── Search Form: Clean, Prominent, Responsive with High-Z Dropdown ── */}
          <form
            onSubmit={handleHeroSearch}
            className="hero-search-box mt-7 sm:mt-8 max-w-2xl relative z-30"
          >
            <div className="rounded-[1.25rem] sm:rounded-pill bg-cream border border-charcoal/15 shadow-md p-1.5 focus-within:ring-2 focus-within:ring-terracotta/20 focus-within:border-terracotta transition-all">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1 sm:gap-0">
                {/* City Dropdown */}
                <div className="sm:border-r sm:border-charcoal/10 shrink-0 px-1 py-0.5 sm:py-0">
                  <Dropdown
                    value={selectedCity}
                    onChange={(val) => setSelectedCity(val)}
                    options={CITY_OPTIONS}
                    variant="inline"
                    icon={<MapPin size={15} className="text-terracotta shrink-0" />}
                    className="min-w-[130px] font-bold text-xs sm:text-sm"
                  />
                </div>

                {/* Keyword Search Input */}
                <div className="flex items-center gap-2 px-3 py-1.5 sm:py-0 flex-1 min-w-0">
                  <Search size={15} className="text-charcoal-70/50 shrink-0 hidden sm:inline" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search karahi, biryani, or chef name..."
                    className="w-full bg-transparent text-xs sm:text-sm text-charcoal placeholder:text-charcoal-70/50 outline-none min-w-0 font-medium"
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-2xl sm:rounded-pill bg-terracotta px-5 py-2.5 sm:py-2.5 text-xs sm:text-sm font-bold text-cream transition-colors hover:bg-terracotta-dark shadow-2xs shrink-0 gap-1.5 cursor-pointer"
                >
                  <Search size={14} />
                  <span>Search</span>
                </button>
              </div>
            </div>
          </form>

          {/* Quick Tag Chips */}
          <div className="hero-actions mt-3.5 sm:mt-4 flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <span className="text-[11px] font-semibold text-charcoal-70/70">Popular:</span>
            {QUICK_TAGS.map((tag) => (
              <button
                key={tag.label}
                type="button"
                onClick={() => {
                  const params = new URLSearchParams()
                  if (tag.query) params.set('q', tag.query)
                  navigate(`/discover?${params.toString()}`)
                }}
                className="rounded-pill border border-charcoal/10 bg-cream-dim/60 px-2.5 py-1 text-[11px] font-semibold text-charcoal-70 hover:border-terracotta/30 hover:text-terracotta transition-all cursor-pointer"
              >
                {tag.label}
              </button>
            ))}
          </div>

          {/* Trust Line */}
          <p className="hero-trust mt-5 text-[11px] text-charcoal-70/70 flex items-center gap-1.5">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-sage shrink-0" />
            100% inspected kitchens. Real chefs, zero industrial additives.
          </p>
        </div>

        {/* ── Right Column: Stable Responsive Card Visual (Mobile / Tablet / Desktop) ── */}
        <div className="hero-visual relative z-10 w-full max-w-[420px] md:max-w-[460px] lg:max-w-[540px] xl:max-w-[600px] aspect-[4/3] sm:aspect-[16/11] md:aspect-[4/3] mx-auto md:ml-auto">
          {/* Card Stack Container */}
          <div className="relative h-full w-full">
            {heroCards.map((card, index) => (
              <div
                ref={(element) => {
                  cardRefs.current[index] = element
                }}
                key={card.title}
                className="hero-card absolute inset-0 overflow-hidden rounded-[1.75rem] sm:rounded-[2rem] bg-cream shadow-lg border border-charcoal/8"
                style={{
                  zIndex: heroCards.length - index,
                  transform: `translate(${index * 12}px, ${index * 10}px) rotate(${
                    index === 0 ? 0 : index % 2 ? 2.5 : -2.5
                  }deg) scale(${1 - index * 0.04})`,
                  opacity: index === 0 ? 1 : 0.94,
                }}
              >
                <img className="h-full w-full object-cover" src={card.image} alt={card.alt} />
              </div>
            ))}

            {/* Active Dish Chip (Top-Right) */}
            <div className="absolute right-2.5 top-2.5 z-10 w-32 sm:w-38 rounded-2xl bg-cream/95 px-3 py-2 shadow-md backdrop-blur-md border border-charcoal/10">
              <div className="flex items-center justify-between">
                <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.12em] text-terracotta truncate">
                  {heroCards[activeCard].label}
                </p>
                <div className="flex items-center gap-0.5 shrink-0">
                  <span className="steam-wave inline-block h-2 w-0.5 rounded-full bg-terracotta" />
                  <span className="steam-wave inline-block h-3 w-0.5 rounded-full bg-terracotta" />
                  <span className="steam-wave inline-block h-2 w-0.5 rounded-full bg-terracotta" />
                </div>
              </div>
              <p className="mt-0.5 font-display text-sm sm:text-base font-bold leading-tight text-charcoal truncate">
                {heroCards[activeCard].title}
              </p>
              <span className="mt-1 block h-0.5 w-4 rounded-full bg-saffron" aria-hidden="true" />
            </div>

            {/* Floating Time Widget (Bottom-Left) */}
            <div className="hero-float absolute -bottom-3 sm:-bottom-4 -left-2 sm:-left-3 z-10 w-44 sm:w-50 rounded-2xl bg-saffron/95 backdrop-blur-md p-3 sm:p-3.5 shadow-lg border border-charcoal/10">
              <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.14em] text-charcoal/75 block">
                {pakistanTime.periodLabel}
              </span>
              <p className="mt-0.5 font-display text-base sm:text-lg font-bold leading-tight text-charcoal">
                {pakistanTime.note}
              </p>
              <p className="mt-1 text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.1em] text-charcoal/60">
                {pakistanTime.timeLabel} PKT
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
