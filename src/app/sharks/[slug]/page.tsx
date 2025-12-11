import { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  getSharkBySlug,
  getSharkStats,
  getSharkProducts,
  getSharkSlugs,
  getSharkTopPerformers,
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
import { ProductCardCommerce } from '@/components/ui/ProductCardCommerce'
import { getSharkPhotos } from '@/lib/queries/products'
import type { Category, ProductStatus, DealOutcome } from '@/lib/supabase/types'
import { isSharkNarrative } from '@/lib/supabase/types'

type Props = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const [shark, stats] = await Promise.all([
    getSharkBySlug(slug),
    getSharkStats(slug),
  ])

  if (!shark) {
    return { title: 'Shark Not Found' }
  }

  const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://tankd.io'

  // Enhanced title with stats
  const title = shark.seo_title ||
    `${shark.name} - ${stats?.total_deals || 0} Deals, ${stats?.success_rate || 0}% Success | Shark Tank`

  // Rich description with stats
  const description = shark.meta_description ||
    `${shark.name} has made ${stats?.total_deals || 0} deals on Shark Tank with a ${stats?.success_rate || 0}% success rate. ${stats?.active_companies || 0} active companies. Explore portfolio, top investments, and partnerships.`

  return {
    title,
    description,

    // OpenGraph for Facebook, LinkedIn
    openGraph: {
      title: `${shark.name} - Shark Tank Investor`,
      description,
      images: shark.photo_url ? [{
        url: shark.photo_url,
        width: 800,
        height: 800,
        alt: shark.name
      }] : [],
      type: 'profile',
      siteName: 'Shark Tank Products',
      url: `${SITE_URL}/sharks/${slug}`,
    },

    // Twitter Card
    twitter: {
      card: 'summary',
      title: `${shark.name} - Shark Tank`,
      description,
      images: shark.photo_url ? [shark.photo_url] : [],
    },

    // Canonical URL (always base URL, even for filtered pages)
    alternates: {
      canonical: `/sharks/${slug}`,
    },

    // Keywords
    keywords: [
      shark.name,
      `${shark.name} Shark Tank`,
      `${shark.name} investments`,
      `${shark.name} portfolio`,
      `${shark.name} net worth`,
      'Shark Tank investor',
      ...(shark.investment_style ? [shark.investment_style] : [])
    ],
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
    coInvestors,
    timeline,
    categoriesData,
    sharkPhotos
  ] = await Promise.all([
    getSharkBySlug(slug),
    getSharkStats(slug),
    getSharkProducts(slug, filters),
    getSharkTopPerformers(slug),
    getSharkCoInvestors(slug),
    getSharkTimeline(slug),
    supabase.from('categories').select('id, name, slug').order('name'),
    getSharkPhotos()
  ])

  if (!shark) {
    notFound()
  }

  const categories: Category[] = categoriesData.data || []
  const currentSeason = 17 // TODO: Get from database or config

  const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://tankd.io'

  // Extract narrative content
  const narrative = isSharkNarrative(shark.narrative_content)
    ? shark.narrative_content
    : null
  const hasNarrative = narrative !== null

  // Person Schema
  const personJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: shark.name,
    description: shark.bio || shark.meta_description || `Shark Tank investor and entrepreneur`,
    image: shark.photo_url,
    url: `${SITE_URL}/sharks/${slug}`,
    ...(shark.social_urls && Object.keys(shark.social_urls).length > 0 && {
      sameAs: Object.values(shark.social_urls).filter(Boolean)
    }),
    jobTitle: 'Investor',
    worksFor: {
      '@type': 'TVSeries',
      name: 'Shark Tank'
    },
    ...(stats && {
      additionalProperty: [
        {
          '@type': 'PropertyValue',
          name: 'Total Deals',
          value: stats.total_deals
        },
        {
          '@type': 'PropertyValue',
          name: 'Success Rate',
          value: `${stats.success_rate}%`
        },
        {
          '@type': 'PropertyValue',
          name: 'Active Companies',
          value: stats.active_companies
        },
        ...(stats.total_invested ? [{
          '@type': 'PropertyValue',
          name: 'Total Invested',
          value: stats.total_invested
        }] : [])
      ]
    })
  }

  // Breadcrumb Schema
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: SITE_URL
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Sharks',
        item: `${SITE_URL}/sharks`
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: shark.name,
        item: `${SITE_URL}/sharks/${slug}`
      }
    ]
  }

  // FAQ Schema (optional but valuable for rich results)
  const faqJsonLd = stats ? {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: `How many deals has ${shark.name} made on Shark Tank?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `${shark.name} has made ${stats.total_deals} deals on Shark Tank.`
        }
      },
      {
        '@type': 'Question',
        name: `What is ${shark.name}'s success rate on Shark Tank?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `${shark.name} has a ${stats.success_rate}% success rate with ${stats.active_companies} active companies out of ${stats.total_deals} total deals.`
        }
      },
      ...(stats.total_invested ? [{
        '@type': 'Question',
        name: `How much has ${shark.name} invested on Shark Tank?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `${shark.name} has invested approximately $${(stats.total_invested / 1000000).toFixed(1)} million on Shark Tank.`
        }
      }] : [])
    ]
  } : null

  return (
    <>
      {/* JSON-LD Scripts */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(personJsonLd).replace(/</g, '\\u003c')
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, '\\u003c')
        }}
      />
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(faqJsonLd).replace(/</g, '\\u003c')
          }}
        />
      )}

      <main className="min-h-screen py-12 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Back link */}
          <div className="mb-8">
            <Link href="/sharks" className="text-sm text-[var(--cyan-600)] hover:underline underline-offset-4 font-display">
              ← All Sharks
            </Link>
          </div>

          {/* Hero section - Full width */}
          <div className="flex flex-col md:flex-row gap-8 mb-12">
            <SharkImage
              src={shark.photo_url}
              name={shark.name}
              size="xl"
              className="shrink-0"
            />
            <div>
              <h1 className="text-3xl md:text-4xl font-medium mb-2">
                {shark.name}
                {shark.is_retired && (
                  <span className="ml-3 text-sm font-normal px-3 py-1 rounded-full bg-[var(--ink-100)] text-[var(--ink-600)] border border-[var(--ink-200)]">
                    No Longer on Shark Tank
                  </span>
                )}
              </h1>
              {shark.investment_style && (
                <p className="text-xl text-[var(--cyan-600)] font-display mb-4">{shark.investment_style}</p>
              )}
              {shark.bio && (
                <p className="text-[var(--ink-600)] leading-relaxed">{shark.bio}</p>
              )}
            </div>
          </div>

          {/* Main content + Sidebar layout */}
          <div className="shark-profile-layout">
            {/* Main Content */}
            <div className="shark-main-content">
              {/* Co-Investors */}
              <SharkCoInvestors coInvestors={coInvestors} sharkName={shark.name} />

              {/* Top Deals */}
              <SharkTopDeals
                topDeals={topPerformers}
                sharkName={shark.name}
              />

              {/* Narrative Content */}
              {hasNarrative && narrative && (
                <article className="shark-narrative">
                  <div className="max-w-3xl mx-auto px-6">
                    {narrative.biography && narrative.biography.length > 0 && (
                      <section className="narrative-section">
                        <h2 className="narrative-heading">Biography</h2>
                        <div className="narrative-text">{narrative.biography}</div>
                      </section>
                    )}

                    {narrative.investment_philosophy && narrative.investment_philosophy.length > 0 && (
                      <section className="narrative-section">
                        <h2 className="narrative-heading">Investment Philosophy</h2>
                        <div className="narrative-text">{narrative.investment_philosophy}</div>
                      </section>
                    )}

                    {narrative.notable_deals && narrative.notable_deals.length > 0 && (
                      <section className="narrative-section narrative-cta-section">
                        <h2 className="narrative-heading">Notable Investments</h2>
                        <div className="narrative-text">{narrative.notable_deals}</div>
                      </section>
                    )}

                    {narrative.shark_tank_journey && narrative.shark_tank_journey.length > 0 && (
                      <section className="narrative-section">
                        <h2 className="narrative-heading">Journey on Shark Tank</h2>
                        <div className="narrative-text">{narrative.shark_tank_journey}</div>
                      </section>
                    )}

                    {narrative.beyond_the_tank && narrative.beyond_the_tank.length > 0 && (
                      <section className="narrative-section">
                        <h2 className="narrative-heading">Beyond the Tank</h2>
                        <div className="narrative-text">{narrative.beyond_the_tank}</div>
                      </section>
                    )}
                  </div>
                </article>
              )}
            </div>

            {/* Sidebar */}
            <aside className="shark-sidebar" aria-label="Shark portfolio summary">
              {/* Stats Card */}
              {stats && (
                <div className="sidebar-card">
                  <h3 className="sidebar-card-label">Portfolio Metrics</h3>
                  <div className="sidebar-stats">
                    <div className="sidebar-stat">
                      <div className="stat-number text-2xl">{stats.total_deals}</div>
                      <div className="stat-label">Total Deals</div>
                    </div>
                    <div className="sidebar-stat">
                      <div className="stat-number text-2xl text-[var(--cyan-600)]">
                        {stats.total_invested ? `$${(stats.total_invested / 1000000).toFixed(1)}M` : '—'}
                      </div>
                      <div className="stat-label">Invested</div>
                    </div>
                    <div className="sidebar-stat">
                      <div className="stat-number text-2xl text-[var(--cyan-600)]">{stats.active_companies}</div>
                      <div className="stat-label">Active</div>
                    </div>
                    <div className="sidebar-stat">
                      <div className="stat-number text-2xl">
                        {stats.success_rate ? `${stats.success_rate}%` : '—'}
                      </div>
                      <div className="stat-label">Success Rate</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Investment Style Card */}
              {shark.investment_style && (
                <div className="sidebar-card sidebar-style-card">
                  <h3 className="sidebar-card-label">Investment Style</h3>
                  <div className="sidebar-style-text">{shark.investment_style}</div>
                </div>
              )}
            </aside>
          </div>

          {/* Portfolio - Full width below sidebar layout */}
          <section className="mb-12">
            <div className="mb-6">
              <p className="section-label mb-2">Full Portfolio</p>
              <h2 className="text-2xl font-medium">All Investments ({products.length})</h2>
            </div>

            <SharkPortfolioFilters categories={categories} currentSeason={currentSeason} />

            {products.length > 0 ? (
              <div className="products-grid-home">
                {products.map(product => (
                  <ProductCardCommerce
                    key={product.id}
                    product={product}
                    sharkPhotos={sharkPhotos}
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

          {/* Timeline - Full width */}
          <SharkTimeline timeline={timeline} sharkName={shark.name} />
        </div>
      </main>
    </>
  )
}
