import type { ImgHTMLAttributes } from 'react'

interface ImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  /** Aspect ratio string e.g. "16/9", "4/3", "1/1". Wraps image in a container to prevent CLS. */
  aspect?: string
}

export function Image({ className = '', alt = '', aspect, loading = 'lazy', ...props }: ImageProps) {
  const img = (
    <img
      className={`block h-full w-full object-cover ${className}`}
      alt={alt}
      loading={loading}
      decoding="async"
      {...props}
    />
  )

  if (aspect) {
    return (
      <div className="overflow-hidden" style={{ aspectRatio: aspect }}>
        {img}
      </div>
    )
  }

  return img
}
