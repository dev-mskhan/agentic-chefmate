import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { isReducedMotion } from '../../hooks/useScrollTriggerCleanup'

interface SplitHeadlineProps {
  text: string
  className?: string
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'div'
  delay?: number
  stagger?: number
  gradient?: boolean
}

export function SplitHeadline({
  text,
  className = '',
  as: Tag = 'h1',
  delay = 0.1,
  stagger = 0.06,
  gradient = false,
}: SplitHeadlineProps) {
  const containerRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    if (!containerRef.current || isReducedMotion()) return

    const words = containerRef.current.querySelectorAll('.split-word-inner')
    if (words.length === 0) return

    gsap.fromTo(
      words,
      { yPercent: 110, opacity: 0 },
      {
        yPercent: 0,
        opacity: 1,
        duration: 0.85,
        stagger,
        delay,
        ease: 'expo.out',
      },
    )
  }, [text, delay, stagger])

  const words = text.split(' ')

  return (
    <Tag ref={containerRef} className={`${className} pb-2 sm:pb-3`}>
      {words.map((word, i) => (
        <span
          key={`${word}-${i}`}
          className="inline-block overflow-hidden mr-[0.22em] pb-1 pt-0.5 align-baseline"
        >
          <span
            className={`split-word-inner inline-block will-change-transform ${
              gradient
                ? 'bg-gradient-to-r from-charcoal from-55% via-[#382c24] to-terracotta bg-clip-text text-transparent'
                : ''
            }`}
          >
            {word}
          </span>
        </span>
      ))}
    </Tag>
  )
}
