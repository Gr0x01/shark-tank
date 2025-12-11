import { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getProductBySlug, getProductSlugs } from '@/lib/queries/products'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { ProductImage } from '@/components/ui/ProductImage'
import { SharkImage } from '@/components/ui/SharkImage'

type Props = {
  params: Promise<{ slug: string }>
}

interface NarrativeContent {
  origin_story?: string | null
  pitch_journey?: string | null
  deal_dynamics?: string | null
  after_tank?: string | null
  current_status?: string | null
  where_to_buy?: string | null
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const product = await getProductBySlug(slug)

  if (!product) {
    return { title: 'Product Not Found' }
  }

  // SEO-optimized title with deal status
  const dealStatus = product.deal_outcome === 'deal'
    ? product.deal_amount
      ? `Got $${product.deal_amount.toLocaleString()} Deal`
      : 'Got a Deal'
    : product.deal_outcome === 'no_deal'
      ? 'No Deal'
      : ''

  const businessStatus = product.status === 'active'
    ? 'Still in Business'
    : product.status === 'out_of_business'
      ? 'Out of Business'
      : ''

  const titleParts = [product.name, 'Shark Tank', dealStatus, businessStatus].filter(Boolean)
  const title = product.seo_title || titleParts.slice(0, 3).join(' | ')

  return {
    title,
    description: product.meta_description || product.pitch_summary || product.tagline ||
      `${product.name} appeared on Shark Tank Season ${product.season}. Find out what happened and where to buy.`,
    openGraph: {
      title: `${product.name} - Shark Tank`,
      description: product.pitch_summary || product.tagline || '',
      images: product.photo_url ? [{ url: product.photo_url }] : [],
    },
  }
}

export async function generateStaticParams() {
  const slugs = await getProductSlugs(100)
  return slugs.map(slug => ({ slug }))
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params
  const product = await getProductBySlug(slug)

  if (!product) {
    notFound()
  }

  const narrative = product.narrative_content as NarrativeContent | null
  const hasNarrative = narrative && Object.values(narrative).some(v => v)

  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <section className="product-hero">
        <div className="max-w-6xl mx-auto px-6 py-12 md:py-16">
          <div className="mb-6">
            <Link href="/products" className="product-breadcrumb">
              ← All Products
            </Link>
          </div>

          <div className="grid lg:grid-cols-[340px_1fr] gap-10 lg:gap-16">
            {/* Product Image */}
            <div className="product-hero-image">
              <ProductImage
                src={product.photo_url}
                alt={product.name}
                size="xl"
              />
              {product.status && (
                <div className="absolute top-4 left-4">
                  <StatusBadge status={product.status} verbose />
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="product-hero-info">
              {/* Episode Badge */}
              {product.season && (
                <div className="product-episode-badge">
                  Season {product.season}{product.episode_number ? `, Episode ${product.episode_number}` : ''}
                </div>
              )}

              <h1 className="product-title">{product.name}</h1>

              {product.company_name && product.company_name !== product.name && (
                <p className="product-company">by {product.company_name}</p>
              )}

              {product.tagline && (
                <p className="product-tagline">{product.tagline}</p>
              )}

              {/* Deal Stats Row */}
              <div className="product-stats-row">
                <div className="product-stat">
                  <span className="product-stat-label">The Ask</span>
                  {product.asking_amount ? (
                    <span className="product-stat-value">
                      ${product.asking_amount.toLocaleString()}
                      <span className="product-stat-detail"> for {product.asking_equity}%</span>
                    </span>
                  ) : (
                    <span className="product-stat-value text-[var(--ink-400)]">Unknown</span>
                  )}
                </div>

                <div className="product-stat-divider" />

                <div className="product-stat">
                  <span className="product-stat-label">The Deal</span>
                  {product.deal_outcome === 'deal' && product.deal_amount ? (
                    <span className="product-stat-value product-stat-deal">
                      ${product.deal_amount.toLocaleString()}
                      <span className="product-stat-detail"> for {product.deal_equity}%</span>
                    </span>
                  ) : product.deal_outcome === 'no_deal' ? (
                    <span className="product-stat-value product-stat-nodeal">No Deal</span>
                  ) : product.deal_outcome === 'deal_fell_through' ? (
                    <span className="product-stat-value product-stat-fell-through">Deal Fell Through</span>
                  ) : (
                    <span className="product-stat-value text-[var(--ink-400)]">Unknown</span>
                  )}
                </div>
              </div>

              {/* Sharks */}
              {product.shark_names?.length > 0 && (
                <div className="product-sharks">
                  <span className="product-sharks-label">Invested by</span>
                  <div className="product-sharks-list">
                    {product.shark_names.map((name, i) => (
                      <Link
                        key={name}
                        href={`/sharks/${product.shark_slugs?.[i]}`}
                        className="product-shark-chip"
                      >
                        <SharkImage src={null} name={name} size="sm" />
                        <span>{name}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* CTA Buttons */}
              <div className="product-cta-row">
                {product.website_url && (
                  <a
                    href={product.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-shop"
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
                    Buy on Amazon
                  </a>
                )}
              </div>

              {product.last_verified && (
                <p className="product-verified">
                  Last verified {new Date(product.last_verified).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Narrative Content */}
      {hasNarrative && (
        <article className="product-narrative">
          <div className="max-w-3xl mx-auto px-6">
            {narrative?.origin_story && (
              <section className="narrative-section">
                <h2 className="narrative-heading">The Origin Story</h2>
                <p className="narrative-text">{narrative.origin_story}</p>
              </section>
            )}

            {narrative?.pitch_journey && (
              <section className="narrative-section">
                <h2 className="narrative-heading">Inside the Tank</h2>
                <p className="narrative-text">{narrative.pitch_journey}</p>
              </section>
            )}

            {narrative?.deal_dynamics && (
              <section className="narrative-section">
                <h2 className="narrative-heading">
                  {product.deal_outcome === 'deal' ? 'Making the Deal' :
                   product.deal_outcome === 'no_deal' ? 'Why No Deal' :
                   'The Negotiation'}
                </h2>
                <p className="narrative-text">{narrative.deal_dynamics}</p>
              </section>
            )}

            {narrative?.after_tank && (
              <section className="narrative-section">
                <h2 className="narrative-heading">{product.name} After Shark Tank</h2>
                <p className="narrative-text">{narrative.after_tank}</p>
              </section>
            )}

            {narrative?.current_status && (
              <section className="narrative-section">
                <h2 className="narrative-heading">Is {product.name} Still in Business?</h2>
                <p className="narrative-text">{narrative.current_status}</p>
              </section>
            )}

            {narrative?.where_to_buy && (
              <section className="narrative-section narrative-cta-section">
                <h2 className="narrative-heading">Where to Buy {product.name}</h2>
                <p className="narrative-text">{narrative.where_to_buy}</p>
                <div className="narrative-cta-buttons">
                  {product.website_url && (
                    <a
                      href={product.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-shop"
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
                      Buy on Amazon
                    </a>
                  )}
                </div>
              </section>
            )}
          </div>
        </article>
      )}

      {/* Fallback content if no narrative */}
      {!hasNarrative && (
        <div className="max-w-3xl mx-auto px-6 py-12">
          {product.pitch_summary && (
            <section className="narrative-section">
              <h2 className="narrative-heading">About {product.name}</h2>
              <p className="narrative-text">{product.pitch_summary}</p>
            </section>
          )}

          {product.founder_names && product.founder_names.length > 0 && (
            <section className="narrative-section">
              <h2 className="narrative-heading">The Founders</h2>
              <p className="text-[var(--ink-700)] font-display font-medium mb-2">
                {product.founder_names.join(', ')}
              </p>
              {product.founder_story && (
                <p className="narrative-text">{product.founder_story}</p>
              )}
            </section>
          )}

          {product.description && (
            <section className="narrative-section">
              <h2 className="narrative-heading">Product Description</h2>
              <p className="narrative-text">{product.description}</p>
            </section>
          )}
        </div>
      )}

      {/* Revenue Stats (if available) */}
      {(product.lifetime_revenue || product.annual_revenue) && (
        <section className="product-revenue-section">
          <div className="max-w-3xl mx-auto px-6">
            <h2 className="narrative-heading">Business Performance</h2>
            <div className="product-revenue-grid">
              {product.lifetime_revenue && (
                <div className="product-revenue-stat">
                  <span className="product-revenue-value">
                    ${(product.lifetime_revenue / 1000000).toFixed(1)}M
                  </span>
                  <span className="product-revenue-label">Lifetime Revenue</span>
                </div>
              )}
              {product.annual_revenue && (
                <div className="product-revenue-stat">
                  <span className="product-revenue-value">
                    ${(product.annual_revenue / 1000000).toFixed(1)}M
                  </span>
                  <span className="product-revenue-label">
                    Annual Revenue {product.revenue_year ? `(${product.revenue_year})` : ''}
                  </span>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Episode Link */}
      {product.season && (
        <section className="product-episode-section">
          <div className="max-w-3xl mx-auto px-6">
            <Link href={`/seasons/${product.season}`} className="product-episode-link">
              <span className="product-episode-link-label">More from this episode</span>
              <span className="product-episode-link-title">
                Season {product.season}{product.episode_number ? `, Episode ${product.episode_number}` : ''}
              </span>
              <span className="product-episode-link-arrow">→</span>
            </Link>
          </div>
        </section>
      )}
    </main>
  )
}
