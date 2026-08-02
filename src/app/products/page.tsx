import { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { getProducts, getProductStats, getSharkPhotos, getCategories, getSharks } from '@/lib/queries/cached'
import { ProductCardCommerce } from '@/components/ui/ProductCardCommerce'
import { FilterSidebar } from '@/components/ui/FilterSidebar'
import { FilterChips } from '@/components/ui/FilterChips'
import { MobileFilters } from '@/components/ui/MobileFilters'
import { InterstitialBand } from '@/components/ui/InterstitialBand'
import type { ProductStatus, DealOutcome } from '@/lib/supabase/types'
import { SITE_URL, SITE_NAME, DEFAULT_OG_IMAGE } from '@/lib/seo/constants'
import { createBreadcrumbSchema, createCollectionPageSchema, escapeJsonLd } from '@/lib/seo/schemas'

// ISR: Revalidate every 12 hours (products updated monthly)
export const revalidate = 43200

export async function generateMetadata({ searchParams }: ProductsPageProps): Promise<Metadata> {
  const params = await searchParams
  const page = parsePageParam(params.page)
  const pageLabel = page > 1 ? ` - Page ${page}` : ''
  const title = `All Shark Tank Products${pageLabel} - Complete Database of Every Pitch | tankd.io`
  const description = 'Browse all Shark Tank products ever pitched. 600+ products with deal details, business status, and where to buy. Filter by shark, category, season, and deal outcome.'
  const hasFilters = Object.entries(params).some(([key, value]) => key !== 'page' && value !== undefined)
  const canonical = page > 1 && !hasFilters ? `${SITE_URL}/products?page=${page}` : `${SITE_URL}/products`

  return {
    title,
    description,
    keywords: [
      'all Shark Tank products',
      'Shark Tank products',
      'Shark Tank products list',
      'every Shark Tank product',
      'Shark Tank database',
      'Mark Cuban deals',
      'Lori Greiner products',
      'still in business',
      'got deal',
      'no deal'
    ],
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: SITE_NAME,
      images: [{
        url: DEFAULT_OG_IMAGE,
        width: 1200,
        height: 630,
        alt: 'Browse All Shark Tank Products'
      }],
      type: 'website'
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [DEFAULT_OG_IMAGE]
    },
    alternates: {
      canonical
    }
  }
}

// Current season - update when new season starts
const CURRENT_SEASON = 17
const PRODUCTS_PER_PAGE = 48

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

function parsePageParam(param: string | string[] | undefined): number {
  const value = Array.isArray(param) ? param[0] : param
  const parsed = Number.parseInt(value || '1', 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1
}

function buildPageHref(params: { [key: string]: string | string[] | undefined }, page: number): string {
  const query = new URLSearchParams()

  for (const [key, value] of Object.entries(params)) {
    if (key === 'page' || value === undefined) continue
    for (const item of Array.isArray(value) ? value : [value]) query.append(key, item)
  }

  if (page > 1) query.set('page', String(page))
  const queryString = query.toString()
  return queryString ? `/products?${queryString}` : '/products'
}

interface ProductsPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const params = await searchParams
  const page = parsePageParam(params.page)

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
    search: Array.isArray(params.q) ? params.q[0] : params.q,
    limit: PRODUCTS_PER_PAGE + 1,
    offset: (page - 1) * PRODUCTS_PER_PAGE,
  }

  const [products, stats, categories, sharks, sharkPhotos] = await Promise.all([
    getProducts(filters),
    getProductStats(),
    getCategories(),
    getSharks(),
    getSharkPhotos(),
  ])
  const hasNextPage = products.length > PRODUCTS_PER_PAGE
  const visibleProducts = products.slice(0, PRODUCTS_PER_PAGE)

  if (page > 1 && visibleProducts.length === 0) notFound()

  // Check if any filters are active
  const hasActiveFilters = filters.status || filters.dealOutcome || filters.season || filters.categorySlug || filters.sharkSlug || filters.search

  const breadcrumbSchema = createBreadcrumbSchema([
    { name: 'Home', url: SITE_URL },
    { name: 'Products' }
  ])

  const collectionSchema = createCollectionPageSchema(
    'All Shark Tank Products',
    'Complete database of every product pitched on Shark Tank',
    `${SITE_URL}/products`,
    stats.total
  )

  return (
    <>
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: escapeJsonLd(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: escapeJsonLd(collectionSchema) }}
      />

      <main className="min-h-screen py-12 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <p className="section-label mb-2">Browse</p>
          <h1 className="text-3xl md:text-4xl font-medium mb-2">All Shark Tank Products</h1>
          {filters.search && (
            <p className="text-sm text-[var(--ink-500)] mb-2">
              Showing results for &ldquo;<span className="font-medium text-[var(--ink-900)]">{filters.search}</span>&rdquo;
            </p>
          )}
          <p className="text-[var(--ink-500)]">
            {hasActiveFilters ? (
              <>Page {page}{visibleProducts.length ? ` · ${visibleProducts.length} products shown` : ''}</>
            ) : (
              <>{stats.total} products · {stats.gotDeal} deals · {stats.active} still active</>
            )}
          </p>
        </div>

        {/* Active Filter Chips */}
        <Suspense fallback={null}>
          <FilterChips sharks={sharks} categories={categories} />
        </Suspense>

        {/* Context-aware Status CTA */}
        {filters.status === 'active' && (
          <InterstitialBand
            title="Still in Business"
            description="These products are still active and thriving. Support businesses that made it beyond the Tank."
            ctaText="Read Success Stories"
            ctaHref="/still-in-business"
            variant="cream"
          />
        )}

        {filters.status === 'out_of_business' && (
          <InterstitialBand
            title="Out of Business"
            description="Not all Shark Tank products survive. Learn what went wrong and what lessons we can take."
            ctaText="View Analysis"
            ctaHref="/out-of-business"
            variant="cream"
          />
        )}

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
              {visibleProducts.map(product => (
                <ProductCardCommerce key={product.id} product={product} sharkPhotos={sharkPhotos} />
              ))}
            </div>

            {visibleProducts.length === 0 && (
              <div className="text-center py-16 text-[var(--ink-400)] card">
                <p className="font-display">No products match your filters.</p>
              </div>
            )}

            {(page > 1 || hasNextPage) && (
              <nav aria-label="Product pages" className="flex items-center justify-between gap-4 mt-10">
                {page > 1 ? (
                  <Link href={buildPageHref(params, page - 1)} className="btn-secondary">← Previous</Link>
                ) : <span />}
                <span className="text-sm text-[var(--ink-500)]">Page {page}</span>
                {hasNextPage ? (
                  <Link href={buildPageHref(params, page + 1)} className="btn-secondary">Next →</Link>
                ) : <span />}
              </nav>
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
    </>
  )
}
