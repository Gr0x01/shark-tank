import { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getEpisode, getEpisodeProducts, getSharkPhotos } from '@/lib/queries/cached'
import { ProductCardCommerce } from '@/components/ui/ProductCardCommerce'
import { SITE_URL, SITE_NAME, DEFAULT_OG_IMAGE } from '@/lib/seo/constants'
import { createBreadcrumbSchema, createTVEpisodeSchema, escapeJsonLd } from '@/lib/seo/schemas'

// ISR: Revalidate every 24 hours (historical episode data)
export const revalidate = 86400

type Props = {
  params: Promise<{ season: string; episode: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { season, episode: ep } = await params
  const episodeData = await getEpisode(parseInt(season), parseInt(ep))

  if (!episodeData) {
    return { title: 'Episode Not Found' }
  }

  const title = episodeData.seo_title ||
    `Season ${season} Episode ${ep}${episodeData.title ? ` - ${episodeData.title}` : ''} | tankd.io`

  const description = episodeData.meta_description ||
    `Products from Shark Tank Season ${season} Episode ${ep}. ${episodeData.air_date ? `Aired ${new Date(episodeData.air_date).toLocaleDateString()}.` : ''} See what deals were made and where to buy.`

  // Build keywords dynamically
  const keywords = [
    `Shark Tank Season ${season} Episode ${ep}`,
    `S${season}E${ep}`,
    'Shark Tank episode',
    ...(episodeData.title ? [episodeData.title] : []),
    ...(episodeData.air_date ? [
      new Date(episodeData.air_date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    ] : []),
    'products',
    'deals'
  ]

  return {
    title,
    description,
    keywords,
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/episodes/${season}/${ep}`,
      siteName: SITE_NAME,
      images: [{
        url: DEFAULT_OG_IMAGE,
        width: 1200,
        height: 630,
        alt: `Shark Tank Season ${season} Episode ${ep}`
      }],
      type: 'video.episode' // Specific OG type for TV episodes
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [DEFAULT_OG_IMAGE]
    },
    alternates: {
      canonical: `/episodes/${season}/${ep}`
    }
  }
}

export default async function EpisodePage({ params }: Props) {
  const { season, episode: ep } = await params
  const seasonNum = parseInt(season)
  const episodeNum = parseInt(ep)

  const [episodeData, products, sharkPhotos] = await Promise.all([
    getEpisode(seasonNum, episodeNum),
    getEpisodeProducts(seasonNum, episodeNum),
    getSharkPhotos(),
  ])

  if (!episodeData && products.length === 0) {
    notFound()
  }

  const breadcrumbSchema = createBreadcrumbSchema([
    { name: 'Home', url: SITE_URL },
    { name: 'Seasons', url: `${SITE_URL}/seasons` },
    { name: `Season ${season}`, url: `${SITE_URL}/seasons/${season}` },
    { name: `Episode ${ep}` }
  ])

  const tvEpisodeSchema = createTVEpisodeSchema(
    seasonNum,
    episodeNum,
    episodeData?.air_date || undefined,
    episodeData?.title || undefined,
    episodeData?.description || undefined
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
        dangerouslySetInnerHTML={{ __html: escapeJsonLd(tvEpisodeSchema) }}
      />

      <main className="min-h-screen py-12 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link href={`/seasons/${season}`} className="text-sm text-[var(--cyan-600)] hover:underline underline-offset-4 font-display">
            ← Season {season}
          </Link>
        </div>

        <div className="mb-10">
          <p className="section-label mb-2">Episode</p>
          <h1 className="text-3xl md:text-4xl font-medium mb-2">
            Season {season}, Episode {ep}
          </h1>

          {episodeData?.title && (
            <h2 className="text-xl text-[var(--ink-600)] mb-2">{episodeData.title}</h2>
          )}

          {episodeData?.air_date && (
            <p className="text-[var(--ink-400)] font-display">
              Aired {new Date(episodeData.air_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          )}
        </div>

        {episodeData?.description && (
          <p className="text-[var(--ink-600)] mb-10 leading-relaxed">{episodeData.description}</p>
        )}

        <section>
          <h2 className="text-xl font-medium mb-4">Products Featured ({products.length})</h2>

          {products.length > 0 ? (
            <div className="products-grid-home">
              {products.map(product => (
                <ProductCardCommerce key={product.id} product={product} sharkPhotos={sharkPhotos} />
              ))}
            </div>
          ) : (
            <div className="bg-white border border-[var(--ink-100)] p-12 text-center">
              <p className="text-[var(--ink-400)] font-display">No product data available for this episode.</p>
            </div>
          )}
        </section>
      </div>
    </main>
    </>
  )
}

