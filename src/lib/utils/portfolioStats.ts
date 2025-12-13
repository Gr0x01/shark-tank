import type { ProductWithSharks } from '@/lib/supabase/types'

/**
 * Compute portfolio statistics from a products array.
 * Used for filter sidebar badge counts.
 */
export function computePortfolioStats(products: ProductWithSharks[]) {
  return {
    total: products.length,
    active: products.filter(p => p.status === 'active').length,
    outOfBusiness: products.filter(p => p.status === 'out_of_business').length,
    gotDeal: products.filter(p => p.deal_outcome === 'deal').length,
    noDeal: products.filter(p => p.deal_outcome === 'no_deal').length,
  }
}
