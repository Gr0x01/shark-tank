import { Metadata } from 'next'
import Link from 'next/link'
import { getSeasons, getSeasonStats } from '@/lib/queries/episodes'
import { SITE_URL, SITE_NAME, DEFAULT_OG_IMAGE } from '@/lib/seo/constants'
import { createBreadcrumbSchema, createCollectionPageSchema, escapeJsonLd } from '@/lib/seo/schemas'

export async function generateMetadata(): Promise<Metadata> {
  const title = 'All Seasons | tankd.io'
  const description = 'Browse all 17+ seasons of Shark Tank. See every product pitched and every deal made, season by season.'

  return {
    title,
    description,
    keywords: [
      'Shark Tank seasons',
      'all seasons',
      'episodes',
      'season 1',
      'season 17',
      'products by season',
      'Shark Tank history'
    ],
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/seasons`,
      siteName: SITE_NAME,
      images: [{
        url: DEFAULT_OG_IMAGE,
        width: 1200,
        height: 630,
        alt: 'Browse Shark Tank by Season'
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
      canonical: `${SITE_URL}/seasons`
    }
  }
}

export default async function SeasonsPage() {
  const seasons = await getSeasons()

  const seasonData = await Promise.all(
    seasons.map(async (season) => ({
      number: season,
      stats: await getSeasonStats(season),
    }))
  )

  const breadcrumbSchema = createBreadcrumbSchema([
    { name: 'Home', url: SITE_URL },
    { name: 'Seasons' }
  ])

  const collectionSchema = createCollectionPageSchema(
    'All Shark Tank Seasons',
    'Browse products from every season of Shark Tank',
    `${SITE_URL}/seasons`,
    seasons.length
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
      <div className="max-w-5xl mx-auto">
        <div className="mb-10">
          <p className="section-label mb-2">Browse</p>
          <h1 className="text-3xl md:text-4xl font-medium mb-2">All Seasons</h1>
          <p className="text-[var(--ink-500)]">
            Browse products by season
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {seasonData.map(({ number, stats }) => (
            <Link
              key={number}
              href={`/seasons/${number}`}
              className="card group"
            >
              <h2 className="text-2xl font-display font-medium mb-3 group-hover:text-[var(--cyan-600)] transition-colors">
                Season {number}
              </h2>
              <div className="text-sm space-y-1">
                <p className="text-[var(--ink-600)]">{stats.total} products</p>
                <p className="text-[var(--ink-600)]">{stats.deals} got deals</p>
                <p className="text-[var(--success)] font-display">{stats.active} still active</p>
              </div>
            </Link>
          ))}
        </div>

        {seasons.length === 0 && (
          <div className="card text-center py-12">
            <p className="text-[var(--ink-400)] font-display">No seasons found. Products need episode data to show seasons.</p>
          </div>
        )}
      </div>
    </main>
    </>
  )
}
