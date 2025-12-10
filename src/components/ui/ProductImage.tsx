'use client'

import Image from 'next/image'
import { useState } from 'react'
import { cn } from '@/lib/utils'

interface ProductImageProps {
  src: string | null | undefined
  alt: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const sizeClasses = {
  sm: 'w-16 h-16',
  md: 'w-24 h-24',
  lg: 'w-32 h-32',
  xl: 'w-full aspect-[4/3]',
}

const iconSizes = {
  sm: 'w-6 h-6',
  md: 'w-8 h-8',
  lg: 'w-10 h-10',
  xl: 'w-16 h-16',
}

export function ProductImage({ src, alt, size = 'md', className }: ProductImageProps) {
  const [error, setError] = useState(false)
  const showPlaceholder = !src || error

  if (showPlaceholder) {
    return (
      <div
        className={cn(
          'relative overflow-hidden rounded bg-[var(--cream)] border border-[var(--ink-100)] flex items-center justify-center',
          sizeClasses[size],
          className
        )}
      >
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23000' fill-opacity='1'%3E%3Cpath d='M0 0h10v10H0zM10 10h10v10H10z'/%3E%3C/g%3E%3C/svg%3E")`,
          backgroundSize: '8px 8px',
        }} />
        <svg 
          className={cn('text-[var(--ink-300)]', iconSizes[size])}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={1.5}
            d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" 
          />
        </svg>
      </div>
    )
  }

  return (
    <div className={cn('relative overflow-hidden rounded bg-[var(--cream)]', sizeClasses[size], className)}>
      <Image
        src={src}
        alt={alt}
        fill
        className="object-cover"
        onError={() => setError(true)}
        sizes={size === 'xl' ? '(max-width: 768px) 100vw, 50vw' : '200px'}
      />
    </div>
  )
}
