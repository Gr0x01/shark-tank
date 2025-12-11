import { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getSharkBySlug, getSharkStats, getSharkProducts, getSharkSlugs } from '@/lib/queries/sharks'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { SharkImage } from '@/components/ui/SharkImage'
import { ProductImage } from '@/components/ui/ProductImage'

type Props = {
  params: Promise<{ slug: string }>
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

export default async function SharkPage({ params }: Props) {
  const { slug } = await params
  const [shark, stats, products] = await Promise.all([
    getSharkBySlug(slug),
    getSharkStats(slug),
    getSharkProducts(slug),
  ])

  if (!shark) {
    notFound()
  }

  return (
    <main className="min-h-screen py-12 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <Link href="/sharks" className="text-sm text-[var(--cyan-600)] hover:underline underline-offset-4 font-display">
            ← All Sharks
          </Link>
        </div>

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

        <section>
          <div className="flex items-end justify-between mb-6">
            <div>
              <p className="section-label mb-2">Investments</p>
              <h2 className="text-2xl font-medium">Portfolio ({products.length})</h2>
            </div>
          </div>
          
          {products.length > 0 ? (
            <div className="space-y-3">
              {products.map(product => (
                <Link
                  key={product.id}
                  href={`/products/${product.slug}`}
                  className="card flex items-center gap-4 group"
                >
                  <ProductImage 
                    src={product.photo_url}
                    alt={product.name}
                    size="sm"
                    className="shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display font-medium text-[var(--ink-900)] group-hover:text-[var(--cyan-600)] transition-colors">
                      {product.name}
                    </h3>
                    {product.tagline && (
                      <p className="text-sm text-[var(--ink-500)] truncate">{product.tagline}</p>
                    )}
                    <p className="text-xs text-[var(--ink-400)] font-display mt-1">
                      Season {product.season}
                      {product.deal_amount && ` · $${product.deal_amount.toLocaleString()} for ${product.deal_equity}%`}
                    </p>
                  </div>
                  <StatusBadge status={product.status} />
                </Link>
              ))}
            </div>
          ) : (
            <div className="card text-center py-12">
              <p className="text-[var(--ink-400)] font-display">No portfolio data available yet.</p>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
