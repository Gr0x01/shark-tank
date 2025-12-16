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

interface ArticlePageProps {
  title: string
  description?: string
  introduction: string
  sections: SEOPageSection[]
  relatedProducts?: ProductWithSharks[]
  sharkPhotos?: Record<string, string>
}

export function ArticlePage({
  title,
  description,
  introduction,
  sections,
  relatedProducts,
  sharkPhotos = {},
}: ArticlePageProps) {
  return (
    <main className="min-h-screen py-12 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">

          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Article Header */}
            <div className="mb-12">
              <p className="section-label mb-2">Shark Tank Guide</p>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-medium mb-4">{title}</h1>

              {description && (
                <p className="text-lg text-[var(--ink-600)] leading-relaxed">{description}</p>
              )}
            </div>

            {/* Article Content */}
            <article className="prose prose-lg max-w-none">
              {/* Introduction */}
              <div
                className="text-[var(--ink-700)] leading-relaxed mb-12 text-lg"
                dangerouslySetInnerHTML={{ __html: formatContent(introduction) }}
              />

              {/* Sections */}
              {sections.map((section, index) => (
                <section
                  key={index}
                  className="mb-12"
                  aria-labelledby={`article-section-${index}`}
                >
                  <h2
                    id={`article-section-${index}`}
                    className="text-2xl md:text-3xl font-medium text-[var(--ink-900)] mb-4 mt-8"
                  >
                    {section.heading}
                  </h2>
                  <div
                    className="text-[var(--ink-700)] leading-relaxed whitespace-pre-line"
                    dangerouslySetInnerHTML={{ __html: formatContent(section.content) }}
                  />
                </section>
              ))}
            </article>
          </div>

          {/* Sidebar */}
          {relatedProducts && relatedProducts.length > 0 && (
            <aside className="lg:col-span-1">
              <div className="sticky top-24">
                <h3 className="text-lg font-medium text-[var(--ink-900)] mb-4">
                  Related Products
                </h3>
                <div className="flex flex-col gap-4">
                  {relatedProducts.slice(0, 5).map(product => (
                    <ProductCardCommerce
                      key={product.id}
                      product={product}
                      sharkPhotos={sharkPhotos}
                      compact
                    />
                  ))}
                </div>
              </div>
            </aside>
          )}
        </div>
      </div>
    </main>
  )
}
