import type { SVGProps } from 'react'

export function Icon({ children, className = '', ...props }: SVGProps<SVGSVGElement>) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" className={`h-5 w-5 ${className}`} {...props}>{children}</svg>
}
