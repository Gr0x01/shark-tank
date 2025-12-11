import { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getEpisode, getEpisodeProducts } from '@/lib/queries/episodes'
import { ProductListCard } from '@/components/ui/ProductListCard'

type Props = {
  params: Promise<{ season: string; episode: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { season, episode: ep } = await params
  const episodeData = await getEpisode(parseInt(season), parseInt(ep))

  if (!episodeData) {
    return { title: 'Episode Not Found' }
  }

  return {
    title: episodeData.seo_title || `Season ${season} Episode ${ep} | Shark Tank Products`,
    description: episodeData.meta_description || `Products from Shark Tank Season ${season} Episode ${ep}`,
  }
}

export default async function EpisodePage({ params }: Props) {
  const { season, episode: ep } = await params
  const seasonNum = parseInt(season)
  const episodeNum = parseInt(ep)

  const [episodeData, products] = await Promise.all([
    getEpisode(seasonNum, episodeNum),
    getEpisodeProducts(seasonNum, episodeNum),
  ])

  if (!episodeData && products.length === 0) {
    notFound()
  }

  return (
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {products.map(product => (
                <ProductListCard key={product.id} product={product} showDealDetails hideSeason />
              ))}
            </div>
          ) : (
            <div className="card text-center py-12">
              <p className="text-[var(--ink-400)] font-display">No product data available for this episode.</p>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

