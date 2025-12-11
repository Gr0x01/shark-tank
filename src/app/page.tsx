import Link from 'next/link'
import { Metadata } from 'next'
import { getProductStats, getLatestEpisodeProducts, getSeasonProducts } from '@/lib/queries/products'
import { getCategories } from '@/lib/queries/categories'
import { LatestEpisodeSection } from '@/components/ui/LatestEpisodeSection'
import { SeasonProductsSection } from '@/components/ui/SeasonProductsSection'
import { SITE_URL, SITE_NAME, DEFAULT_OG_IMAGE } from '@/lib/seo/constants'
import { createOrganizationSchema, createSearchActionSchema, escapeJsonLd } from '@/lib/seo/schemas'

export async function generateMetadata(): Promise<Metadata> {
  const title = 'tankd.io | Every Shark Tank Product, Deal & Business Status'
  const description = 'Every Shark Tank product in one place. Find out which products are still in business, where to buy them, and what deals were made.'

  return {
    title,
    description,
    keywords: [
      'Shark Tank',
      'Shark Tank products',
      'deals',
      'Mark Cuban',
      'Lori Greiner',
      'Kevin O\'Leary',
      'still in business',
      'where to buy',
      'business status'
    ],
    openGraph: {
      title,
      description,
      url: SITE_URL,
      siteName: SITE_NAME,
      images: [{
        url: DEFAULT_OG_IMAGE,
        width: 1200,
        height: 630,
        alt: 'tankd.io - Every Shark Tank Product'
      }],
      type: 'website',
      locale: 'en_US'
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [DEFAULT_OG_IMAGE]
    },
    alternates: {
      canonical: SITE_URL
    },
    robots: 'index, follow'
  }
}

export default async function Home() {
  const [stats, categories, latestEpisode] = await Promise.all([
    getProductStats(),
    getCategories(),
    getLatestEpisodeProducts(4),
  ])

  const currentSeason = latestEpisode.episode?.season || 17
  const seasonData = await getSeasonProducts(currentSeason, 24)

  const organizationSchema = createOrganizationSchema()
  const searchActionSchema = createSearchActionSchema()

  return (
    <>
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: escapeJsonLd(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: escapeJsonLd(searchActionSchema) }}
      />

      <main className="min-h-screen bg-[var(--warm-white)]">
      <section className="category-nav">
        <div className="max-w-6xl mx-auto px-6">
          <div className="category-nav-inner">
            {categories.slice(0, 6).map((cat) => (
              <Link
                key={cat.id}
                href={`/categories/${cat.slug}`}
                className="category-nav-link"
              >
                {cat.name}
              </Link>
            ))}
            <Link href={`/seasons/${currentSeason}`} className="category-nav-link category-nav-season">
              Season {currentSeason}
            </Link>
            <Link href="/products" className="category-nav-link category-nav-all">
              All Products
            </Link>
          </div>
        </div>
      </section>

      {latestEpisode.episode && (
        <LatestEpisodeSection 
          episode={latestEpisode.episode} 
          products={latestEpisode.products}
          sharkPhotos={latestEpisode.sharkPhotos}
        />
      )}

      <SeasonProductsSection
        products={seasonData.products}
        season={currentSeason}
        totalProducts={stats.total}
        sharkPhotos={seasonData.sharkPhotos}
      />

      <section className="season-browser">
        <div className="max-w-6xl mx-auto px-6">
          <h3 className="season-browser-title">Browse by Season</h3>
          <div className="season-browser-list">
            {Array.from({ length: currentSeason }, (_, i) => currentSeason - i).map((season) => (
              <Link
                key={season}
                href={`/seasons/${season}`}
                className={`season-browser-link ${season === currentSeason ? 'current' : ''}`}
              >
                Season {season}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bottom-cta">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="bottom-cta-text">
            <span className="text-[var(--success)]">{stats.active}</span> active businesses · 
            <span className="text-[var(--gold)]"> {stats.gotDeal}</span> got deals · 
            <span className="text-[var(--ink-400)]"> {stats.outOfBusiness}</span> out of business
          </p>
        </div>
      </section>
    </main>
    </>
  )
}
