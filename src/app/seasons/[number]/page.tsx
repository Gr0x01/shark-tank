import { Metadata } from 'next'
import Link from 'next/link'
import { getSeasonNumbers, getSeasonStats, getEpisodesBySeason } from '@/lib/queries/episodes'
import { getProductsBySeason } from '@/lib/queries/products'
import { ProductListCard } from '@/components/ui/ProductListCard'
import { SITE_URL, SITE_NAME, DEFAULT_OG_IMAGE } from '@/lib/seo/constants'
import { createBreadcrumbSchema, createCollectionPageSchema, escapeJsonLd } from '@/lib/seo/schemas'

type Props = {
  params: Promise<{ number: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { number } = await params

  const title = `Season ${number} | tankd.io`
  const description = `All products from Shark Tank Season ${number}. See what deals were made, which companies are still in business, and where to buy.`

  return {
    title,
    description,
    keywords: [
      `Shark Tank Season ${number}`,
      `Season ${number} products`,
      `Season ${number} deals`,
      'Shark Tank',
      'still in business',
      'got deal',
      'episode list'
    ],
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/seasons/${number}`,
      siteName: SITE_NAME,
      images: [{
        url: DEFAULT_OG_IMAGE,
        width: 1200,
        height: 630,
        alt: `Shark Tank Season ${number} Products`
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
      canonical: `/seasons/${number}`
    }
  }
}

export async function generateStaticParams() {
  const seasons = await getSeasonNumbers()
  return seasons.map(n => ({ number: n.toString() }))
}

export default async function SeasonPage({ params }: Props) {
  const { number } = await params
  const seasonNum = parseInt(number)

  const [products, stats, episodes] = await Promise.all([
    getProductsBySeason(seasonNum),
    getSeasonStats(seasonNum),
    getEpisodesBySeason(seasonNum),
  ])

  const breadcrumbSchema = createBreadcrumbSchema([
    { name: 'Home', url: SITE_URL },
    { name: 'Seasons', url: `${SITE_URL}/seasons` },
    { name: `Season ${number}` }
  ])

  const collectionSchema = createCollectionPageSchema(
    `Shark Tank Season ${number}`,
    `All products from Season ${number} of Shark Tank`,
    `${SITE_URL}/seasons/${number}`,
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
          <Link href="/seasons" className="text-sm text-[var(--cyan-600)] hover:underline underline-offset-4 font-display">
            ← All Seasons
          </Link>
        </div>

        <div className="mb-10">
          <p className="section-label mb-2">Season</p>
          <h1 className="text-3xl md:text-4xl font-medium mb-2">Season {number}</h1>
          <p className="text-[var(--ink-500)]">
            {stats.total} products · {stats.deals} deals · {stats.active} still active
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-10">
          <div className="card text-center">
            <div className="stat-number text-3xl">{stats.total}</div>
            <div className="stat-label mt-1">Products</div>
          </div>
          <div className="card text-center">
            <div className="stat-number text-3xl text-[var(--gold)]">{stats.deals}</div>
            <div className="stat-label mt-1">Got Deals</div>
          </div>
          <div className="card text-center">
            <div className="stat-number text-3xl text-[var(--success)]">{stats.active}</div>
            <div className="stat-label mt-1">Still Active</div>
          </div>
        </div>

        {episodes.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xl font-medium mb-4">Episodes</h2>
            <div className="flex flex-wrap gap-2">
              {episodes.map(ep => (
                <Link
                  key={ep.id}
                  href={`/episodes/${ep.season}/${ep.episode_number}`}
                  className="px-4 py-2 card text-sm font-display hover:text-[var(--cyan-600)] transition-colors"
                >
                  Ep {ep.episode_number}
                </Link>
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className="text-xl font-medium mb-4">Products</h2>

          {products.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {products.map(product => (
                <ProductListCard key={product.id} product={product} hideSeason />
              ))}
            </div>
          ) : (
            <div className="card text-center py-12">
              <p className="text-[var(--ink-400)] font-display">No products found for this season.</p>
            </div>
          )}
        </section>
      </div>
    </main>
    </>
  )
}

