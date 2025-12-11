import { Metadata } from 'next'
import { Suspense } from 'react'
import { getProducts, getProductStats, getSharkPhotos } from '@/lib/queries/products'
import { getCategories } from '@/lib/queries/categories'
import { getSharks } from '@/lib/queries/sharks'
import { ProductCardCommerce } from '@/components/ui/ProductCardCommerce'
import { FilterSidebar } from '@/components/ui/FilterSidebar'
import { FilterChips } from '@/components/ui/FilterChips'
import { MobileFilters } from '@/components/ui/MobileFilters'
import type { ProductStatus, DealOutcome } from '@/lib/supabase/types'

export const metadata: Metadata = {
  title: 'All Products | Shark Tank Products',
  description: 'Browse every product ever pitched on Shark Tank. Filter by status, shark, category, and more.',
}

// Current season - update when new season starts
const CURRENT_SEASON = 17

/**
 * Parse and validate season parameter
 * Returns undefined for invalid values (NaN, out of range, etc.)
 */
function parseSeasonParam(param: string | string[] | undefined): number | undefined {
  if (!param) return undefined
  const value = Array.isArray(param) ? param[0] : param
  const parsed = parseInt(value, 10)
  // Validate: must be a number between 1 and current season
  if (isNaN(parsed) || parsed < 1 || parsed > CURRENT_SEASON) return undefined
  return parsed
}

interface ProductsPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const params = await searchParams

  // Parse filter params
  const statusParam = params.status
  const dealParam = params.deal
  const categoryParam = params.category
  const sharkParam = params.shark

  // Build filters object with validated season
  const filters = {
    status: (Array.isArray(statusParam) ? statusParam[0] : statusParam) as ProductStatus | undefined,
    dealOutcome: (Array.isArray(dealParam) ? dealParam[0] : dealParam) as DealOutcome | undefined,
    season: parseSeasonParam(params.season),
    categorySlug: Array.isArray(categoryParam) ? categoryParam[0] : categoryParam,
    sharkSlug: Array.isArray(sharkParam) ? sharkParam[0] : sharkParam,
    limit: 100,
  }

  const [products, stats, categories, sharks, sharkPhotos] = await Promise.all([
    getProducts(filters),
    getProductStats(),
    getCategories(),
    getSharks(),
    getSharkPhotos(),
  ])

  // Check if any filters are active
  const hasActiveFilters = filters.status || filters.dealOutcome || filters.season || filters.categorySlug || filters.sharkSlug

  return (
    <main className="min-h-screen py-12 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <p className="section-label mb-2">Browse</p>
          <h1 className="text-3xl md:text-4xl font-medium mb-2">All Products</h1>
          <p className="text-[var(--ink-500)]">
            {hasActiveFilters ? (
              <>{products.length} results</>
            ) : (
              <>{stats.total} products · {stats.gotDeal} deals · {stats.active} still active</>
            )}
          </p>
        </div>

        {/* Active Filter Chips */}
        <Suspense fallback={null}>
          <FilterChips sharks={sharks} categories={categories} />
        </Suspense>

        <div className="flex gap-10">
          {/* Desktop Sidebar */}
          <Suspense fallback={null}>
            <FilterSidebar
              stats={stats}
              sharks={sharks}
              categories={categories}
              currentSeason={CURRENT_SEASON}
            />
          </Suspense>

          {/* Product Grid */}
          <div className="flex-1">
            <div className="products-grid-home">
              {products.map(product => (
                <ProductCardCommerce key={product.id} product={product} sharkPhotos={sharkPhotos} />
              ))}
            </div>

            {products.length === 0 && (
              <div className="text-center py-16 text-[var(--ink-400)] card">
                <p className="font-display">No products match your filters.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Filter Button + Drawer */}
      <Suspense fallback={null}>
        <MobileFilters
          stats={stats}
          sharks={sharks}
          categories={categories}
          currentSeason={CURRENT_SEASON}
        />
      </Suspense>
    </main>
  )
}
