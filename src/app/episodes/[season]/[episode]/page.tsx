import { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getEpisode, getEpisodeProducts } from '@/lib/queries/episodes'
import { StatusBadge } from '@/components/ui/StatusBadge'

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
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link href={`/seasons/${season}`} className="text-sm text-blue-600 hover:underline">
            ← Season {season}
          </Link>
        </div>

        <h1 className="text-4xl font-bold mb-2">
          Season {season}, Episode {ep}
        </h1>
        
        {episodeData?.title && (
          <h2 className="text-xl text-gray-600 mb-2">{episodeData.title}</h2>
        )}
        
        {episodeData?.air_date && (
          <p className="text-gray-500 mb-4">
            Aired {new Date(episodeData.air_date).toLocaleDateString()}
          </p>
        )}

        {episodeData?.description && (
          <p className="text-gray-700 mb-8">{episodeData.description}</p>
        )}

        <section>
          <h2 className="text-2xl font-semibold mb-4">Products Featured ({products.length})</h2>
          
          {products.length > 0 ? (
            <div className="space-y-4">
              {products.map(product => (
                <Link
                  key={product.id}
                  href={`/products/${product.slug}`}
                  className="flex items-start justify-between border rounded-lg p-4 hover:shadow transition-shadow"
                >
                  <div>
                    <h3 className="font-semibold text-lg">{product.name}</h3>
                    {product.tagline && (
                      <p className="text-gray-600">{product.tagline}</p>
                    )}
                    <div className="mt-2 text-sm">
                      {product.deal_outcome === 'deal' ? (
                        <span className="text-green-600">
                          Deal: ${product.deal_amount?.toLocaleString()} for {product.deal_equity}%
                          {product.shark_names?.length > 0 && ` with ${product.shark_names.join(', ')}`}
                        </span>
                      ) : product.deal_outcome === 'no_deal' ? (
                        <span className="text-red-600">No Deal</span>
                      ) : (
                        <span className="text-gray-500">Outcome unknown</span>
                      )}
                    </div>
                  </div>
                  <StatusBadge status={product.status} />
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No product data available for this episode.</p>
          )}
        </section>
      </div>
    </main>
  )
}

