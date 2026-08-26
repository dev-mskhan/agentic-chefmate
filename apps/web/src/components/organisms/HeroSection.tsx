import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { Link } from 'react-router-dom'

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

  if (hour < 12) return { periodLabel: 'Good morning', note: 'Start with something made slowly.', timeLabel }
  if (hour < 17) return { periodLabel: 'Good afternoon', note: 'There is still time to set the table.', timeLabel }
  return { periodLabel: 'Good evening', note: 'Good food tastes better when you know who made it.', timeLabel }
}

const heroCards = [
  {
    image: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1200&q=85',
    alt: 'Colorful home-cooked meal on a dining table',
    label: 'Tonight in Lahore',
    title: 'Smoky karahi',
  },
  {
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1200&q=85',
    alt: 'Fresh seasonal bowl with colorful vegetables',
    label: 'Tonight in Karachi',
    title: 'Sea salt pulao',
  },
  {
    image: 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=1200&q=85',
    alt: 'Fresh vegetables prepared for dinner',
    label: 'Tonight in Islamabad',
    title: 'Garden daal',
  },
]

export function HeroSection() {
  const heroRef = useRef<HTMLElement>(null)
  const cardRefs = useRef<(HTMLDivElement | null)[]>([])
  const activeCardRef = useRef(0)
  const [activeCard, setActiveCard] = useState(0)
  const [pakistanTime, setPakistanTime] = useState(() => getPakistanTime())

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
          gsap.set('.hero-kicker, .hero-title, .hero-copy, .hero-actions, .hero-visual, .hero-search-hint', { opacity: 1, clearProps: 'transform,clipPath' })
          return
        }

        gsap.timeline({ defaults: { ease: 'power3.out' } })
          .from('.hero-kicker', { opacity: 0, y: 18, duration: 0.45 })
          .from('.hero-title', { opacity: 0, y: 46, clipPath: 'inset(0 0 100% 0)', duration: 0.8 }, '-=0.2')
          .from('.hero-copy, .hero-actions, .hero-search-hint', { opacity: 0, y: 20, duration: 0.5, stagger: 0.08 }, '-=0.45')
          .from('.hero-visual', { opacity: 0, scale: 0.92, rotate: 2, duration: 0.9, ease: 'expo.out' }, '-=0.65')

        gsap.to('.hero-float', { y: -10, duration: 2.8, ease: 'sine.inOut', repeat: -1, yoyo: true })
      }, heroRef)
      revertContext = () => context.revert()

      rotationTimer = window.setInterval(() => {
        const currentIndex = activeCardRef.current
        const nextIndex = (currentIndex + 1) % heroCards.length
        const current = cardRefs.current[currentIndex]
        const next = cardRefs.current[nextIndex]
        if (!current || !next) return
        gsap.timeline({ defaults: { overwrite: 'auto' } })
          .set(next, { zIndex: '3' })
          .set(current, { zIndex: '1' }, '<')
          .to(current, { x: 36, y: 30, rotate: -4, scale: 0.88, opacity: 0.94, duration: 1.05, ease: 'power3.inOut' })
          .to(next, { x: 0, y: 0, rotate: 0, scale: 1, opacity: 1, duration: 1.1, ease: 'expo.out' }, '<0.08')
          .then(() => {
            const remaining = cardRefs.current.find((card) => card && card !== current && card !== next)
            if (remaining) remaining.style.zIndex = '2'
            activeCardRef.current = nextIndex
            setActiveCard(activeCardRef.current)
          })
      }, 4200)

    })
    return () => {
      cancelled = true
      revertContext?.()
      if (rotationTimer) window.clearInterval(rotationTimer)
      window.clearInterval(clockTimer)
    }
  }, [])

  return (
    <section ref={heroRef} className="relative mx-auto grid max-w-[1500px] gap-12 px-4 pb-20 pt-12 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-20 lg:px-12 lg:pb-24 lg:pt-20 2xl:px-16">
      <div className="relative z-10 max-w-2xl">
        <h1 className="hero-title max-w-[12ch] font-display text-[clamp(3.6rem,2.5rem+4.5vw,7.5rem)] leading-[0.88] tracking-[-0.045em]">Good food. <em className="text-terracotta">Close to your home.</em></h1>
        <p className="hero-copy mt-7 max-w-xl text-lg leading-8 text-charcoal-70">Meet independent chefs across Pakistan, discover food with a point of view, and bring something worth gathering around home.</p>
        <div className="hero-actions mt-8 flex flex-wrap gap-3">
          <Link to="/discover" className="inline-flex min-h-11 items-center justify-center rounded-pill bg-terracotta px-5 text-sm font-semibold text-cream transition-colors hover:bg-terracotta-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta">Start exploring</Link>
          <Link to="/signup" className="inline-flex min-h-11 items-center justify-center rounded-pill border border-charcoal/20 bg-transparent px-5 text-sm font-semibold text-charcoal transition-colors hover:border-terracotta hover:text-terracotta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta">Cook with us</Link>
        </div>
        <p className="hero-search-hint mt-8 text-sm text-charcoal-70"><span className="mr-2 inline-block h-2 w-2 rounded-full bg-sage" />Search chefs by city, then find the dish that brings the table together.</p>
      </div>
      <div className="hero-visual relative min-h-[440px] lg:min-h-[580px] max-sm:min-h-[390px]">
        <div className="absolute right-0 top-0 h-[82%] w-[82%] max-w-[700px] max-sm:left-[4%] max-sm:right-[4%] max-sm:h-[92%] max-sm:w-auto max-sm:max-w-none">
          {heroCards.map((card, index) => (
            <div ref={(element) => { cardRefs.current[index] = element }} key={card.title} className="hero-card absolute inset-0 overflow-hidden rounded-[2.5rem] bg-cream shadow-lg" style={{ zIndex: heroCards.length - index, transform: `translate(${index * 18}px, ${index * 16}px) rotate(${index === 0 ? 0 : index % 2 ? 4 : -4}deg) scale(${1 - index * 0.06})`, opacity: index === 0 ? 1 : 0.94 }}>
              <img className="h-full w-full object-cover" src={card.image} alt={card.alt} />
            </div>
          ))}
          <div className="absolute right-3 top-3 z-10 w-32 rounded-xl bg-cream/92 px-3 py-2.5 shadow-md backdrop-blur-sm sm:right-4 sm:top-4 sm:w-40 sm:px-4 sm:py-3">
            <p className="text-xs font-semibold uppercase leading-5 tracking-[0.14em] text-terracotta">{heroCards[activeCard].label}</p>
            <p className="mt-1.5 max-w-[12ch] font-display text-[clamp(1.2rem,1rem+0.8vw,1.7rem)] leading-tight">{heroCards[activeCard].title}</p>
            <span className="mt-2.5 block h-1 w-6 rounded-full bg-saffron" aria-hidden="true" />
          </div>
        </div>
        <div className="hero-float absolute bottom-1 left-0 z-10 w-56 rounded-2xl bg-saffron p-5 shadow-md sm:w-64">
          <span className="text-xs font-semibold uppercase tracking-[0.16em]">{pakistanTime.periodLabel}</span>
          <p className="mt-3 font-display text-2xl leading-tight">{pakistanTime.note}</p>
          <p className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-charcoal/65">{pakistanTime.timeLabel} PKT</p>
        </div>
      </div>
    </section>
  )
}
