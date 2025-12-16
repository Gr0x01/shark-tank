import type { ProductWithSharks } from '@/lib/supabase/types'
import { ProductCardCommerce } from '@/components/ui/ProductCardCommerce'
import type { SEOPageSection } from '@/lib/seo/seo-content'

// Simple text formatting - converts newlines to paragraphs
// Safe because content comes from our own generated JSON files
function formatContent(text: string): string {
  // Convert double newlines to paragraph breaks
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim())
  if (paragraphs.length > 1) {
    return paragraphs.map(p => `<p>${p.replace(/\n/g, '<br/>')}</p>`).join('')
  }
  // Single paragraph - just convert single newlines to <br>
  return text.replace(/\n/g, '<br/>')
}

interface FilteredListingPageProps {
  title: string
  introduction: string
  sections?: SEOPageSection[]
  products: ProductWithSharks[]
  stats: {
    total: number
    percentage: number
  }
  sharkPhotos?: Record<string, string>
}

export function FilteredListingPage({
  title,
  introduction,
  sections,
  products,
  stats,
  sharkPhotos = {},
}: FilteredListingPageProps) {
  return (
    <main className="min-h-screen py-12 px-6">
      <div className="max-w-6xl mx-auto">

        {/* Header Section */}
        <div className="mb-12">
          <p className="section-label mb-2">Shark Tank Products</p>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-medium mb-4">{title}</h1>

          {/* Stats Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--cyan-50)] border border-[var(--cyan-200)] rounded-full text-sm text-[var(--cyan-700)] font-medium mb-8">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" />
              <path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" />
            </svg>
            {stats.total.toLocaleString()} products · {stats.percentage}% of all Shark Tank businesses
          </div>
        </div>

        {/* Narrative Content */}
        <div className="prose prose-lg max-w-none mb-16">
          {/* Introduction */}
          <div
            className="text-[var(--ink-700)] leading-relaxed mb-8"
            dangerouslySetInnerHTML={{ __html: formatContent(introduction) }}
          />

          {/* Sections */}
          {sections?.map((section, index) => (
            <section
              key={index}
              className="mb-8"
              aria-labelledby={`section-heading-${index}`}
            >
              <h2
                id={`section-heading-${index}`}
                className="text-2xl font-medium text-[var(--ink-900)] mb-4 mt-8"
              >
                {section.heading}
              </h2>
              <div
                className="text-[var(--ink-700)] leading-relaxed whitespace-pre-line"
                dangerouslySetInnerHTML={{ __html: formatContent(section.content) }}
              />
            </section>
          ))}
        </div>

        {/* Divider */}
        <div className="border-t border-[var(--ink-200)] mb-12" />

        {/* Products Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-medium text-[var(--ink-900)] mb-6">
            All {stats.total.toLocaleString()} Products
          </h2>
        </div>

        {/* Product Grid */}
        <div className="products-grid-home">
          {products.map(product => (
            <ProductCardCommerce
              key={product.id}
              product={product}
              sharkPhotos={sharkPhotos}
            />
          ))}
        </div>

        {/* Empty State */}
        {products.length === 0 && (
          <div className="text-center py-16 text-[var(--ink-400)] card">
            <p className="font-display">No products found.</p>
          </div>
        )}
      </div>
    </main>
  )
}
