import { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  getSharkBySlug,
  getSharkStats,
  getSharkProducts,
  getSharkSlugs,
  getSharkTopPerformers,
  getSharkRecentFailures,
  getSharkCoInvestors,
  getSharkTimeline,
  type SharkProductFilters
} from '@/lib/queries/sharks'
import { createClient } from '@/lib/supabase/server'
import { SharkImage } from '@/components/ui/SharkImage'
import { SharkTopDeals } from '@/components/ui/SharkTopDeals'
import { SharkCoInvestors } from '@/components/ui/SharkCoInvestors'
import { SharkPortfolioFilters } from '@/components/ui/SharkPortfolioFilters'
import { SharkTimeline } from '@/components/ui/SharkTimeline'
import { ProductListCard } from '@/components/ui/ProductListCard'
import type { Category, ProductStatus, DealOutcome } from '@/lib/supabase/types'

type Props = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const shark = await getSharkBySlug(slug)
  
  if (!shark) {
    return { title: 'Shark Not Found' }
  }

  return {
    title: shark.seo_title || `${shark.name} | Shark Tank Products`,
    description: shark.meta_description || `Explore ${shark.name}'s Shark Tank portfolio and investments`,
  }
}

export async function generateStaticParams() {
  const slugs = await getSharkSlugs()
  return slugs.map(slug => ({ slug }))
}

export default async function SharkPage({ params, searchParams }: Props) {
  const { slug } = await params
  const search = await searchParams
  const supabase = await createClient()

  // Parse filters from URL
  const filters: SharkProductFilters = {}

  if (search.status) {
    const statusValues = Array.isArray(search.status) ? search.status : [search.status]
    if (statusValues.length > 0) {
      filters.status = statusValues[0] as ProductStatus
    }
  }

  if (search.deal) {
    const dealValues = Array.isArray(search.deal) ? search.deal : [search.deal]
    if (dealValues.length > 0) {
      filters.dealOutcome = dealValues[0] as DealOutcome
    }
  }

  if (search.season) {
    const seasonValue = Array.isArray(search.season) ? search.season[0] : search.season
    filters.season = seasonValue ? parseInt(seasonValue) : undefined
  }

  if (search.category) {
    filters.categorySlug = Array.isArray(search.category) ? search.category[0] : search.category
  }

  // Fetch all data in parallel
  const [
    shark,
    stats,
    products,
    topPerformers,
    failures,
    coInvestors,
    timeline,
    categoriesData
  ] = await Promise.all([
    getSharkBySlug(slug),
    getSharkStats(slug),
    getSharkProducts(slug, filters),
    getSharkTopPerformers(slug),
    getSharkRecentFailures(slug),
    getSharkCoInvestors(slug),
    getSharkTimeline(slug),
    supabase.from('categories').select('id, name, slug').order('name')
  ])

  if (!shark) {
    notFound()
  }

  const categories: Category[] = categoriesData.data || []
  const currentSeason = 17 // TODO: Get from database or config

  return (
    <main className="min-h-screen py-12 px-6">
      <div className="max-w-5xl mx-auto">
        {/* Back link */}
        <div className="mb-8">
          <Link href="/sharks" className="text-sm text-[var(--cyan-600)] hover:underline underline-offset-4 font-display">
            ← All Sharks
          </Link>
        </div>

        {/* Hero section */}
        <div className="flex flex-col md:flex-row gap-8 mb-12">
          <SharkImage
            src={shark.photo_url}
            name={shark.name}
            size="xl"
            className="shrink-0"
          />
          <div>
            <h1 className="text-3xl md:text-4xl font-medium mb-2">{shark.name}</h1>
            {shark.investment_style && (
              <p className="text-xl text-[var(--cyan-600)] font-display mb-4">{shark.investment_style}</p>
            )}
            {shark.bio && (
              <p className="text-[var(--ink-600)] leading-relaxed">{shark.bio}</p>
            )}
          </div>
        </div>

        {/* Stats grid */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
            <div className="card text-center">
              <div className="stat-number text-3xl">{stats.total_deals}</div>
              <div className="stat-label mt-1">Total Deals</div>
            </div>
            <div className="card text-center">
              <div className="stat-number text-3xl text-[var(--cyan-600)]">
                {stats.total_invested ? `$${(stats.total_invested / 1000000).toFixed(1)}M` : '—'}
              </div>
              <div className="stat-label mt-1">Total Invested</div>
            </div>
            <div className="card text-center">
              <div className="stat-number text-3xl text-[var(--success)]">{stats.active_companies}</div>
              <div className="stat-label mt-1">Active Companies</div>
            </div>
            <div className="card text-center">
              <div className="stat-number text-3xl">
                {stats.success_rate ? `${stats.success_rate}%` : '—'}
              </div>
              <div className="stat-label mt-1">Success Rate</div>
            </div>
          </div>
        )}

        {/* Co-Investors */}
        <SharkCoInvestors coInvestors={coInvestors} sharkName={shark.name} />

        {/* Top/Bottom Deals */}
        <SharkTopDeals
          topDeals={topPerformers}
          failures={failures}
          sharkName={shark.name}
        />

        {/* Portfolio with filters */}
        <section className="mb-12">
          <div className="mb-6">
            <p className="section-label mb-2">Full Portfolio</p>
            <h2 className="text-2xl font-medium">All Investments ({products.length})</h2>
          </div>

          <SharkPortfolioFilters categories={categories} currentSeason={currentSeason} />

          {products.length > 0 ? (
            <div className="space-y-3">
              {products.map(product => (
                <ProductListCard
                  key={product.id}
                  product={product}
                  showDealDetails
                />
              ))}
            </div>
          ) : (
            <div className="card text-center py-12">
              <p className="text-[var(--ink-400)] font-display">
                {Object.keys(filters).length > 0
                  ? 'No products match the selected filters.'
                  : 'No portfolio data available yet.'}
              </p>
            </div>
          )}
        </section>

        {/* Timeline */}
        <SharkTimeline timeline={timeline} sharkName={shark.name} />
      </div>
    </main>
  )
}
