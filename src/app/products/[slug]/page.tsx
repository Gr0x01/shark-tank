import { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getProductBySlug, getProducts } from '@/lib/queries/products'
import { StatusBadge } from '@/components/ui/StatusBadge'

type Props = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const product = await getProductBySlug(slug)
  
  if (!product) {
    return { title: 'Product Not Found' }
  }

  return {
    title: product.seo_title || `${product.name} | Shark Tank Products`,
    description: product.meta_description || product.tagline || `Learn about ${product.name} from Shark Tank`,
  }
}

export async function generateStaticParams() {
  const products = await getProducts({ limit: 100 })
  return products.map(p => ({ slug: p.slug }))
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params
  const product = await getProductBySlug(slug)

  if (!product) {
    notFound()
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link href="/products" className="text-sm text-blue-600 hover:underline">
            ← All Products
          </Link>
        </div>

        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-4xl font-bold">{product.name}</h1>
            {product.company_name && product.company_name !== product.name && (
              <p className="text-gray-600">by {product.company_name}</p>
            )}
          </div>
          <StatusBadge status={product.status} />
        </div>

        {product.tagline && (
          <p className="text-xl text-gray-600 mb-6">{product.tagline}</p>
        )}

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold text-sm text-gray-500 uppercase mb-2">Episode</h3>
            <p className="text-lg">
              {product.season && product.episode_number
                ? `Season ${product.season}, Episode ${product.episode_number}`
                : 'Unknown'}
            </p>
            {product.air_date && (
              <p className="text-sm text-gray-500">
                {new Date(product.air_date).toLocaleDateString()}
              </p>
            )}
          </div>

          <div className="border rounded-lg p-4">
            <h3 className="font-semibold text-sm text-gray-500 uppercase mb-2">The Ask</h3>
            {product.asking_amount ? (
              <>
                <p className="text-lg">${product.asking_amount.toLocaleString()}</p>
                <p className="text-sm text-gray-500">for {product.asking_equity}% equity</p>
              </>
            ) : (
              <p className="text-gray-400">Unknown</p>
            )}
          </div>

          <div className="border rounded-lg p-4">
            <h3 className="font-semibold text-sm text-gray-500 uppercase mb-2">The Deal</h3>
            {product.deal_outcome === 'deal' && product.deal_amount ? (
              <>
                <p className="text-lg text-green-600">${product.deal_amount.toLocaleString()}</p>
                <p className="text-sm text-gray-500">for {product.deal_equity}% equity</p>
                {product.shark_names?.length > 0 && (
                  <p className="text-sm text-gray-600 mt-1">with {product.shark_names.join(', ')}</p>
                )}
              </>
            ) : product.deal_outcome === 'no_deal' ? (
              <p className="text-red-600">No Deal</p>
            ) : (
              <p className="text-gray-400">Unknown</p>
            )}
          </div>
        </div>

        {product.description && (
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-3">About</h2>
            <p className="text-gray-700">{product.description}</p>
          </section>
        )}

        {product.founder_names && product.founder_names.length > 0 && (
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-3">Founders</h2>
            <p className="text-gray-700">{product.founder_names.join(', ')}</p>
            {product.founder_story && (
              <p className="text-gray-600 mt-2">{product.founder_story}</p>
            )}
          </section>
        )}

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-3">Where to Buy</h2>
          <div className="flex gap-3">
            {product.website_url && (
              <a
                href={product.website_url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Official Website
              </a>
            )}
            {product.amazon_url && (
              <a
                href={product.amazon_url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
              >
                Amazon
              </a>
            )}
            {!product.website_url && !product.amazon_url && (
              <p className="text-gray-500">No purchase links available yet</p>
            )}
          </div>
        </section>

        {product.last_verified && (
          <p className="text-sm text-gray-400">
            Last verified: {new Date(product.last_verified).toLocaleDateString()}
          </p>
        )}
      </div>
    </main>
  )
}

