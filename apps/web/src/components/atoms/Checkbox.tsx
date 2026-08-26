import type { InputHTMLAttributes } from 'react'
import type { ReactNode } from 'react'

export function Checkbox({ children, className = '', ...props }: InputHTMLAttributes<HTMLInputElement> & { children?: ReactNode }) {
  return <label className={`inline-flex min-h-11 cursor-pointer items-center gap-3 text-sm text-charcoal ${className}`}><input type="checkbox" className="h-4 w-4 accent-terracotta" {...props} />{children}</label>
}
