import type { ImgHTMLAttributes } from 'react'

interface AvatarProps extends ImgHTMLAttributes<HTMLImageElement> {
  size?: 'sm' | 'md' | 'lg'
}

const sizes = { sm: 'h-8 w-8', md: 'h-11 w-11', lg: 'h-16 w-16' }

export function Avatar({ className = '', size = 'md', alt = '', ...props }: AvatarProps) {
  return <img className={`rounded-full object-cover ${sizes[size]} ${className}`} alt={alt} {...props} />
}
