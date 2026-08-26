import type { ImgHTMLAttributes } from 'react'

export function Image({ className = '', alt = '', ...props }: ImgHTMLAttributes<HTMLImageElement>) {
  return <img className={`block h-full w-full object-cover ${className}`} alt={alt} {...props} />
}
