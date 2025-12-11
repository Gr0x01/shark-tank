import Link from 'next/link'
import type { ProductWithSharks } from '@/lib/supabase/types'
import { StatusBadge } from './StatusBadge'
import { ProductImage } from './ProductImage'

interface ProductListCardProps {
  product: ProductWithSharks
  /** Show deal amount and equity instead of just shark names */
  showDealDetails?: boolean
  /** Hide the season info (useful when already on a season page) */
  hideSeason?: boolean
}

export function ProductListCard({
  product,
  showDealDetails = false,
  hideSeason = false
}: ProductListCardProps) {
  const hasDeal = product.deal_outcome === 'deal'
  const noDeal = product.deal_outcome === 'no_deal'

  return (
    <Link
      href={`/products/${product.slug}`}
      className="card group"
    >
      <div className="flex gap-4">
        <ProductImage
          src={product.photo_url}
          alt={product.name}
          size="md"
          className="shrink-0"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-display font-medium text-[var(--ink-900)] truncate group-hover:text-[var(--cyan-600)] transition-colors">
              {product.name}
            </h3>
            <StatusBadge status={product.status} />
          </div>
          {product.tagline && (
            <p className="text-sm text-[var(--ink-500)] mb-2 line-clamp-2">{product.tagline}</p>
          )}
          <p className="text-xs font-display">
            {showDealDetails ? (
              // Detailed deal info (used on episode pages)
              hasDeal ? (
                <span className="text-[var(--success)]">
                  ${product.deal_amount?.toLocaleString()} for {product.deal_equity}%
                  {product.shark_names?.length > 0 && (
                    <span className="text-[var(--cyan-600)]"> · {product.shark_names.join(', ')}</span>
                  )}
                </span>
              ) : noDeal ? (
                <span className="text-[var(--danger)]">No Deal</span>
              ) : (
                <span className="text-[var(--ink-400)]">Outcome unknown</span>
              )
            ) : (
              // Simple info (used on products, categories, season detail pages)
              <>
                {!hideSeason && product.season && (
                  <span className="text-[var(--ink-400)]">Season {product.season}</span>
                )}
                {hasDeal && product.shark_names?.length > 0 ? (
                  <span className="text-[var(--cyan-600)]">
                    {!hideSeason && product.season ? ' · ' : ''}{product.shark_names.join(', ')}
                  </span>
                ) : noDeal ? (
                  <span className="text-[var(--danger)]">
                    {!hideSeason && product.season ? ' · ' : ''}No Deal
                  </span>
                ) : null}
              </>
            )}
          </p>
        </div>
      </div>
    </Link>
  )
}
