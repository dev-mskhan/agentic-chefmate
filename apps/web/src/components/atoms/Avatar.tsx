import type { ImgHTMLAttributes } from 'react'

interface AvatarProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'size'> {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  name?: string
  src?: string
}

const sizes = {
  xs: 'h-7 w-7 text-[10px]',
  sm: 'h-9 w-9 text-xs',
  md: 'h-11 w-11 text-sm',
  lg: 'h-14 w-14 text-base',
  xl: 'h-20 w-20 text-xl font-display',
}

export function Avatar({
  className = '',
  size = 'md',
  alt = '',
  name,
  src,
  ...props
}: AvatarProps) {
  const initials = name
    ? name
        .split(' ')
        .filter(Boolean)
        .map((p) => p[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'U'

  if (!src) {
    return (
      <div
        className={`inline-flex items-center justify-center rounded-full bg-terracotta-10 font-semibold text-terracotta border border-terracotta/20 select-none shadow-sm ${sizes[size]} ${className}`}
        aria-label={alt || name || 'User avatar'}
      >
        {initials}
      </div>
    )
  }

  return (
    <img
      src={src}
      className={`rounded-full object-cover border border-charcoal/10 shadow-sm ${sizes[size]} ${className}`}
      alt={alt || name || 'User avatar'}
      {...props}
    />
  )
}
