import { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getProductBySlug, getProducts } from '@/lib/queries/products'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { ProductImage } from '@/components/ui/ProductImage'
import { SharkImage } from '@/components/ui/SharkImage'

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
    <main className="min-h-screen py-12 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link href="/products" className="text-sm text-[var(--cyan-600)] hover:underline underline-offset-4 font-display">
            ← All Products
          </Link>
        </div>

        <div className="grid md:grid-cols-[280px_1fr] gap-10 mb-12">
          <ProductImage 
            src={product.photo_url} 
            alt={product.name}
            size="xl"
          />
          
          <div>
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                <h1 className="text-3xl md:text-4xl font-medium mb-1">{product.name}</h1>
                {product.company_name && product.company_name !== product.name && (
                  <p className="text-[var(--ink-500)]">by {product.company_name}</p>
                )}
              </div>
              <StatusBadge status={product.status} verbose />
            </div>

            {product.tagline && (
              <p className="text-xl text-[var(--ink-600)] mb-6">{product.tagline}</p>
            )}

            <div className="flex gap-3 mb-6">
              {product.website_url && (
                <a
                  href={product.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary"
                >
                  Official Website
                </a>
              )}
              {product.amazon_url && (
                <a
                  href={product.amazon_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary"
                >
                  Amazon
                </a>
              )}
            </div>

            {product.last_verified && (
              <p className="text-xs text-[var(--ink-400)] font-display">
                Last verified {new Date(product.last_verified).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mb-12">
          <div className="card">
            <h3 className="font-display font-medium text-xs text-[var(--ink-400)] uppercase tracking-wider mb-2">Episode</h3>
            <p className="text-lg font-display text-[var(--ink-900)]">
              {product.season && product.episode_number
                ? `Season ${product.season}, Ep ${product.episode_number}`
                : 'Unknown'}
            </p>
            {product.air_date && (
              <p className="text-sm text-[var(--ink-500)]">
                {new Date(product.air_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            )}
          </div>

          <div className="card">
            <h3 className="font-display font-medium text-xs text-[var(--ink-400)] uppercase tracking-wider mb-2">The Ask</h3>
            {product.asking_amount ? (
              <>
                <p className="text-lg font-display text-[var(--ink-900)]">${product.asking_amount.toLocaleString()}</p>
                <p className="text-sm text-[var(--ink-500)]">for {product.asking_equity}% equity</p>
              </>
            ) : (
              <p className="text-[var(--ink-400)]">Unknown</p>
            )}
          </div>

          <div className="card">
            <h3 className="font-display font-medium text-xs text-[var(--ink-400)] uppercase tracking-wider mb-2">The Deal</h3>
            {product.deal_outcome === 'deal' && product.deal_amount ? (
              <>
                <p className="text-lg font-display text-[var(--success)]">${product.deal_amount.toLocaleString()}</p>
                <p className="text-sm text-[var(--ink-500)]">for {product.deal_equity}% equity</p>
              </>
            ) : product.deal_outcome === 'no_deal' ? (
              <p className="text-lg font-display text-[var(--danger)]">No Deal</p>
            ) : (
              <p className="text-[var(--ink-400)]">Unknown</p>
            )}
          </div>
        </div>

        {product.shark_names?.length > 0 && (
          <section className="mb-12">
            <h2 className="text-xl font-medium mb-4">Invested By</h2>
            <div className="flex gap-4">
              {product.shark_names.map((name, i) => (
                <Link 
                  key={name}
                  href={`/sharks/${product.shark_slugs?.[i]}`}
                  className="flex items-center gap-3 card group"
                >
                  <SharkImage src={null} name={name} size="sm" />
                  <span className="font-display font-medium text-[var(--ink-900)] group-hover:text-[var(--cyan-600)] transition-colors">
                    {name}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {product.description && (
          <section className="mb-12">
            <h2 className="text-xl font-medium mb-4">About</h2>
            <p className="text-[var(--ink-600)] leading-relaxed">{product.description}</p>
          </section>
        )}

        {product.founder_names && product.founder_names.length > 0 && (
          <section className="mb-12">
            <h2 className="text-xl font-medium mb-4">Founders</h2>
            <p className="text-[var(--ink-900)] font-display">{product.founder_names.join(', ')}</p>
            {product.founder_story && (
              <p className="text-[var(--ink-600)] mt-2 leading-relaxed">{product.founder_story}</p>
            )}
          </section>
        )}

        {!product.website_url && !product.amazon_url && (
          <section className="mb-12">
            <h2 className="text-xl font-medium mb-4">Where to Buy</h2>
            <p className="text-[var(--ink-500)]">No purchase links available yet.</p>
          </section>
        )}
      </div>
    </main>
  )
}
