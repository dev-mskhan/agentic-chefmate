import { useEffect } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export function useScrollTriggerCleanup() {
  useEffect(() => {
    // Wait on variable fonts load before refreshing trigger coordinates
    if (typeof document !== 'undefined' && 'fonts' in document) {
      document.fonts.ready.then(() => {
        ScrollTrigger.refresh()
      })
    }

    return () => {
      // Kill all active ScrollTriggers on route unmount to prevent memory leaks
      ScrollTrigger.getAll().forEach((t) => t.kill())
    }
  }, [])
}

export function isReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
