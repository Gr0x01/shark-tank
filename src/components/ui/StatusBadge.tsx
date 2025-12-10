import { cn } from '@/lib/utils'
import type { ProductStatus } from '@/lib/supabase/types'

const variants: Record<ProductStatus, string> = {
  active: 'bg-green-100 text-green-800',
  out_of_business: 'bg-red-100 text-red-800',
  acquired: 'bg-blue-100 text-blue-800',
  unknown: 'bg-gray-100 text-gray-800',
}

const labels: Record<ProductStatus, string> = {
  active: 'Active',
  out_of_business: 'Closed',
  acquired: 'Acquired',
  unknown: 'Unknown',
}

const labelsVerbose: Record<ProductStatus, string> = {
  active: '✓ Still in Business',
  out_of_business: '✗ Out of Business',
  acquired: '→ Acquired',
  unknown: '? Status Unknown',
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
      'inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium',
      variants[validStatus],
      className
    )}>
      {label}
    </span>
  )
}
