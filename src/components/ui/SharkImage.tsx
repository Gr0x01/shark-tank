'use client'

import Image from 'next/image'
import { useState } from 'react'
import { cn } from '@/lib/utils'

interface SharkImageProps {
  src: string | null | undefined
  name: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const sizeClasses = {
  sm: 'w-12 h-12',
  md: 'w-[72px] h-[72px]',
  lg: 'w-24 h-24',
  xl: 'w-32 h-32',
}

const textSizes = {
  sm: 'text-lg',
  md: 'text-2xl',
  lg: 'text-3xl',
  xl: 'text-4xl',
}

export function SharkImage({ src, name, size = 'md', className }: SharkImageProps) {
  const [error, setError] = useState(false)
  const showPlaceholder = !src || error
  const initial = name.charAt(0).toUpperCase()

  if (showPlaceholder) {
    return (
      <div
        className={cn(
          'relative overflow-hidden rounded-full bg-[var(--cream)] border border-[var(--ink-100)] flex items-center justify-center',
          sizeClasses[size],
          className
        )}
      >
        <span className={cn('font-display font-medium text-[var(--ink-500)]', textSizes[size])}>
          {initial}
        </span>
      </div>
    )
  }

  return (
    <div className={cn('relative overflow-hidden rounded-full bg-[var(--cream)]', sizeClasses[size], className)}>
      <Image
        src={src}
        alt={name}
        fill
        className="object-cover"
        onError={() => setError(true)}
        sizes="150px"
      />
    </div>
  )
}
