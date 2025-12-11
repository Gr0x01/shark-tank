import { cn } from '@/lib/utils'
import type { ProductStatus } from '@/lib/supabase/types'

const variants: Record<ProductStatus, string> = {
  active: 'bg-emerald-50/80 text-emerald-700',
  out_of_business: 'bg-red-50/80 text-red-700',
  acquired: 'bg-sky-50/80 text-sky-700',
  unknown: 'bg-[var(--ink-100)] text-[var(--ink-500)]',
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
      'inline-flex items-center font-display text-[0.6875rem] font-bold uppercase tracking-[0.12em] px-3 py-1.5',
      variants[validStatus],
      className
    )}>
      {label}
    </span>
  )
}
