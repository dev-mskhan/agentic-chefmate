import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { isReducedMotion } from '../../hooks/useScrollTriggerCleanup'

gsap.registerPlugin(ScrollTrigger)

interface StatCounterProps {
  value: number
  prefix?: string
  suffix?: string
  decimals?: number
  duration?: number
  mode?: 'scroll' | 'instant'
  className?: string
}

export function StatCounter({
  value,
  prefix = '',
  suffix = '',
  decimals = 0,
  duration = 1.4,
  mode = 'scroll',
  className = '',
}: StatCounterProps) {
  const elRef = useRef<HTMLSpanElement>(null)
  const [displayValue, setDisplayValue] = useState<string>(
    isReducedMotion() ? value.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) : '0',
  )

  useEffect(() => {
    if (!elRef.current) return

    if (isReducedMotion()) {
      setDisplayValue(value.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }))
      return
    }

    const obj = { val: 0 }

    if (mode === 'instant') {
      gsap.to(obj, {
        val: value,
        duration: Math.min(duration, 0.5),
        ease: 'power2.out',
        onUpdate: () => {
          setDisplayValue(
            obj.val.toLocaleString(undefined, {
              minimumFractionDigits: decimals,
              maximumFractionDigits: decimals,
            }),
          )
        },
      })
      return
    }

    const ctx = gsap.context(() => {
      gsap.to(obj, {
        val: value,
        duration,
        ease: 'power1.out',
        scrollTrigger: {
          trigger: elRef.current,
          start: 'top 88%',
          once: true,
        },
        onUpdate: () => {
          setDisplayValue(
            obj.val.toLocaleString(undefined, {
              minimumFractionDigits: decimals,
              maximumFractionDigits: decimals,
            }),
          )
        },
      })
    }, elRef)

    return () => ctx.revert()
  }, [value, duration, mode, decimals])

  return (
    <span ref={elRef} className={`tabular-nums font-bold ${className}`}>
      {prefix}
      {displayValue}
      {suffix}
    </span>
  )
}
