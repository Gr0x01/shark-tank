import { cn } from '@/lib/utils'
import type { ProductStatus } from '@/lib/supabase/types'

const variants: Record<ProductStatus, string> = {
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  out_of_business: 'bg-red-50 text-red-700 border-red-200',
  acquired: 'bg-sky-50 text-sky-700 border-sky-200',
  unknown: 'bg-[var(--cream)] text-[var(--ink-500)] border-[var(--ink-200)]',
}

const labels: Record<ProductStatus, string> = {
  active: 'Active',
  out_of_business: 'Closed',
  acquired: 'Acquired',
  unknown: 'Unknown',
}

const labelsVerbose: Record<ProductStatus, string> = {
  active: 'Still in Business',
  out_of_business: 'Out of Business',
  acquired: 'Acquired',
  unknown: 'Status Unknown',
}

interface StatusBadgeProps {
  status: ProductStatus | string
  verbose?: boolean
  className?: string
}

export function StatusBadge({ status, verbose = false, className }: StatusBadgeProps) {
  const validStatus = (status in variants ? status : 'unknown') as ProductStatus
  const label = verbose ? labelsVerbose[validStatus] : labels[validStatus]
  
  return (
    <span className={cn(
      'inline-flex items-center text-xs px-2 py-0.5 rounded border font-display font-medium',
      variants[validStatus],
      className
    )}>
      {label}
    </span>
  )
}
