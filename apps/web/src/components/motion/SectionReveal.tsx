import { useEffect, useRef, type ReactNode } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { isReducedMotion } from '../../hooks/useScrollTriggerCleanup'

gsap.registerPlugin(ScrollTrigger)

interface SectionRevealProps {
  children: ReactNode
  className?: string
  stagger?: number
  start?: string
  y?: number
  duration?: number
}

export function SectionReveal({
  children,
  className = '',
  stagger = 0.12,
  start = 'top 82%',
  y = 36,
  duration = 0.8,
}: SectionRevealProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current || isReducedMotion()) return

    const container = containerRef.current
    const targets = container.querySelectorAll('[data-reveal]')
    const elementsToAnimate = targets.length > 0 ? targets : [container]

    const ctx = gsap.context(() => {
      gsap.fromTo(
        elementsToAnimate,
        { opacity: 0, y },
        {
          opacity: 1,
          y: 0,
          duration,
          stagger: targets.length > 0 ? stagger : 0,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: container,
            start,
            once: true,
          },
        },
      )
    }, containerRef)

    return () => ctx.revert()
  }, [stagger, start, y, duration])

  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  )
}
