---
Last-Updated: 2025-12-12
Maintainer: RB
Status: Active
---

# Page Template System

## Overview

The page template system provides standardized components and a generator script for creating SEO content pages. This ensures consistency across all article and listing pages, proper SEO metadata, and reduces the risk of implementation errors.

### Problem Solved
Before this system, coding agents created inconsistent page implementations with:
- Varying component structures
- Missing or incorrect SEO metadata
- Inconsistent schema.org markup
- Different error handling patterns
- Ad-hoc HTML sanitization

### Solution
1. **Generator Script** (`scripts/create-seo-page.ts`) - Enforces consistent page structure
2. **Two Page Components** - Standardized layouts for different content types
3. **Template Documentation** (`.templates/` directory) - Reference guides for developers

## Quick Start

### Create an Article Page (Guides, How-Tos)
```bash
npx tsx scripts/create-seo-page.ts article "how-to-apply" "How to Apply"
npx tsx scripts/enrich-seo-pages.ts --page how-to-apply
```

### Create a Listing Page (Filtered Products)
```bash
npx tsx scripts/create-seo-page.ts listing "biggest-deals" "Biggest Deals"
# Customize product filters in the generated file
npx tsx scripts/enrich-seo-pages.ts --page biggest-deals
```

## Page Types

### 1. ArticlePage Component
**Location:** `src/components/seo/ArticlePage.tsx`

**Use For:** Editorial content, guides, how-to articles, informational pages

**Layout:**
- 2-column grid (content + optional sidebar)
- Article header with section label
- Introduction + narrative sections
- Optional related products sidebar

**Props Interface:**
```typescript
interface ArticlePageProps {
  title: string                          // Page H1
  description?: string                   // Optional subtitle
  introduction: string                   // HTML content (sanitized)
  sections: SEOPageSection[]             // Array of {heading, content}
  relatedProducts?: ProductWithSharks[]  // Optional sidebar products
  sharkPhotos?: Record<string, string>   // Shark photo URLs
}
```

**Example Pages:**
- `/how-to-apply` - Guide for applying to Shark Tank
- `/success-stories` - Article about successful products

**SEO Schema:** Uses `createArticleSchema()` with OpenGraph type `article`

### 2. FilteredListingPage Component
**Location:** `src/components/seo/FilteredListingPage.tsx`

**Use For:** Product listings with narrative introduction, filtered data pages

**Layout:**
- Single column layout
- Stats badge (product count, percentage)
- Introduction + optional narrative sections
- Product grid with filters applied

**Props Interface:**
```typescript
interface FilteredListingPageProps {
  title: string                    // Page H1
  introduction: string             // HTML content (sanitized)
  sections?: SEOPageSection[]      // Optional narrative sections
  products: ProductWithSharks[]    // Products to display
  stats: {
    total: number                  // Total products shown
    percentage: number             // % of all Shark Tank products
  }
  sharkPhotos?: Record<string, string>
}
```

**Example Pages:**
- `/still-in-business` - Active Shark Tank businesses
- `/out-of-business` - Failed businesses

**SEO Schema:** Uses `createCollectionPageSchema()` with OpenGraph type `website`

## Creating a New Page

### Step 1: Generate the Page
```bash
npx tsx scripts/create-seo-page.ts <type> <slug> <title>

# Type: 'article' or 'listing'
# Slug: lowercase-with-hyphens
# Title: Display Title (Title Case)
```

**The generator will:**
- ✅ Validate slug format (lowercase, hyphens only)
- ✅ Check for existing pages (prevents overwrites)
- ✅ Create `src/app/{slug}/page.tsx` with correct pattern
- ✅ Include all required imports and metadata
- ✅ Set up SEO schemas (breadcrumb + article/collection)
- ✅ Configure error boundaries and fallback UI

### Step 2: Customize (If Needed)

**For Listing Pages:**
Update the product filter in the generated file:
```typescript
getProducts({ status: 'active', limit: 500 })
// Change to your desired filter:
// - { dealOutcome: 'deal' }
// - { category: 'food_and_beverage' }
// - { sharkSlug: 'lori-greiner' }
```

**For Article Pages:**
If you want related products in the sidebar, uncomment the products fetching code in the template.

### Step 3: Generate Content
```bash
npx tsx scripts/enrich-seo-pages.ts --page your-slug
```

This populates the `seo_pages` database table with AI-generated content (introduction + sections).

### Step 4: Test
```bash
npm run dev -- -p 3004
# Visit http://localhost:3004/your-slug
```

## Component Patterns

### Metadata Generation Pattern
Every page follows this pattern:

```typescript
export async function generateMetadata(): Promise<Metadata> {
  const content = await loadSEOContent(PAGE_SLUG)

  if (!content) {
    return {
      title: `${PAGE_TITLE} | ${SITE_NAME}`,
      description: 'Default description.',
    }
  }

  return {
    title: content.title,
    description: content.meta_description,
    keywords: content.keywords,
    openGraph: { /* ... */ },
    twitter: { /* ... */ },
    alternates: {
      canonical: `${SITE_URL}/${PAGE_SLUG}`
    }
  }
}
```

### Schema.org Structured Data
All pages include two schemas:

**1. Breadcrumb Schema** (navigation)
```typescript
const breadcrumbSchema = createBreadcrumbSchema([
  { name: 'Home', url: SITE_URL },
  { name: PAGE_TITLE }
])
```

**2. Content Schema** (article or collection)
```typescript
// For ArticlePage
const articleSchema = createArticleSchema({
  headline: content.title,
  description: content.meta_description,
  url: `${SITE_URL}/${PAGE_SLUG}`,
  datePublished: content.generated_at,
  dateModified: content.generated_at,
})

// For FilteredListingPage
const collectionSchema = createCollectionPageSchema(
  content.title,
  content.meta_description,
  `${SITE_URL}/${PAGE_SLUG}`,
  products.length
)
```

### Error Boundary Pattern
All pages wrap content in `SEOErrorBoundary`:

```typescript
return (
  <>
    {/* Schema.org scripts */}
    <SEOErrorBoundary>
      <ArticlePage {...props} />
    </SEOErrorBoundary>
  </>
)
```

This catches React errors and displays a fallback UI instead of crashing the page.

### Content Loading Pattern
Pages load content via `loadSEOContent()` and provide fallback UI:

```typescript
const content = await loadSEOContent(PAGE_SLUG)

if (!content) {
  return (
    <main className="min-h-screen py-12 px-6">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-3xl font-medium mb-4">Content Not Available</h1>
        <p className="text-[var(--ink-600)]">
          Please run: <code>npx tsx scripts/enrich-seo-pages.ts --page {PAGE_SLUG}</code>
        </p>
      </div>
    </main>
  )
}
```

### HTML Sanitization
All user-generated/AI-generated HTML is sanitized with DOMPurify:

```typescript
dangerouslySetInnerHTML={{
  __html: DOMPurify.sanitize(content, {
    ALLOWED_TAGS: ['p', 'strong', 'em', 'a', 'ul', 'ol', 'li', 'br', 'h2', 'h3', 'h4'],
    ALLOWED_ATTR: ['href', 'target', 'rel']
  })
}}
```

This prevents XSS attacks while allowing basic formatting.

## Content Enrichment Workflow

### Database Schema
Pages are stored in the `seo_pages` table:

```sql
CREATE TABLE seo_pages (
  id UUID PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  meta_description TEXT,
  keywords TEXT[],
  content JSONB NOT NULL,  -- {introduction, sections: [{heading, content}]}
  generated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Content Generation
The `enrich-seo-pages.ts` script:
1. Takes a page slug as input
2. Uses Tavily to research the topic
3. Uses OpenAI gpt-4.1-mini to synthesize content
4. Validates with Zod schemas
5. Inserts into `seo_pages` table

**Cost:** ~$0.01-0.03 per page for research + synthesis

### Content Structure
```typescript
{
  introduction: string,  // HTML paragraph(s)
  sections: [
    {
      heading: string,   // H2 heading text
      content: string    // HTML paragraph(s)
    }
  ]
}
```

## Template Files Reference

The `.templates/` directory contains reference documentation:

- **`README.md`** - Overview of template system and quick start guide
- **`NEW-PAGE-CHECKLIST.md`** - Step-by-step checklist for creating pages
- **`seo-page-template.md`** - Full code templates with copy-paste examples

These are useful if you need to manually create a page or understand the patterns in depth.

## Rules & Best Practices

### DO:
✅ **Use the generator script** - Ensures consistency and prevents errors
✅ **Follow component patterns** - Don't modify ArticlePage or FilteredListingPage
✅ **Sanitize HTML** - Always use DOMPurify for user/AI content
✅ **Include error boundaries** - Wrap all pages in SEOErrorBoundary
✅ **Add schema.org markup** - Include breadcrumb + content schemas
✅ **Generate content** - Run enrich-seo-pages.ts after creating page
✅ **Customize filters** - Update product queries for listing pages

### DON'T:
❌ **Create custom layouts** - Use ArticlePage or FilteredListingPage only
❌ **Skip error boundaries** - Pages will crash instead of showing fallback
❌ **Hardcode content** - Always load via loadSEOContent()
❌ **Forget schemas** - SEO and rich snippets depend on them
❌ **Modify component props** - Changes break existing pages
❌ **Use inline styles** - Follow Tailwind + CSS variable patterns

## Common Product Filters

For `FilteredListingPage`, customize the `getProducts()` call:

```typescript
// All active businesses
getProducts({ status: 'active', limit: 500 })

// Products with deals
getProducts({ dealOutcome: 'deal', limit: 500 })

// Failed businesses
getProducts({ status: 'out_of_business', limit: 500 })

// Specific shark's portfolio
getProducts({ sharkSlug: 'lori-greiner', limit: 500 })

// Specific category
getProducts({ category: 'food_and_beverage', limit: 500 })

// Combined filters
getProducts({
  status: 'active',
  dealOutcome: 'deal',
  category: 'technology',
  limit: 500
})
```

## Examples

### Example 1: Create a "Best Products" Article
```bash
# 1. Generate the page
npx tsx scripts/create-seo-page.ts article "best-products" "Best Shark Tank Products"

# 2. Generate content
npx tsx scripts/enrich-seo-pages.ts --page best-products

# 3. Test
npm run dev -- -p 3004
# Visit http://localhost:3004/best-products
```

### Example 2: Create a "Biggest Deals" Listing
```bash
# 1. Generate the page
npx tsx scripts/create-seo-page.ts listing "biggest-deals" "Biggest Deals"

# 2. Customize filters in src/app/biggest-deals/page.tsx
# Change: getProducts({ limit: 500 })
# To: getProducts({ dealOutcome: 'deal', limit: 500 })
# Then sort by dealAmount descending in the query

# 3. Generate content
npx tsx scripts/enrich-seo-pages.ts --page biggest-deals

# 4. Test
npm run dev -- -p 3004
```

### Example 3: Create a Shark-Specific Page
```bash
# 1. Generate listing page
npx tsx scripts/create-seo-page.ts listing "lori-greiner-products" "Lori Greiner's Products"

# 2. Customize filter to: getProducts({ sharkSlug: 'lori-greiner', limit: 500 })

# 3. Generate content
npx tsx scripts/enrich-seo-pages.ts --page lori-greiner-products

# 4. Test and verify products are filtered correctly
```

## Troubleshooting

### Page Already Exists Error
```bash
Error: Page already exists at src/app/your-slug/page.tsx
```
**Solution:** Delete the existing page or use a different slug

### Content Not Available Error (on page load)
```
Content Not Available
Please run: npx tsx scripts/enrich-seo-pages.ts --page your-slug
```
**Solution:** Run the enrichment script to generate page content

### Wrong Page Type
If you generated the wrong type (article vs listing):
1. Delete `src/app/your-slug/`
2. Re-run generator with correct type

### Products Not Showing
For `FilteredListingPage`, check:
1. Product filter is correct
2. Products exist in database matching filter
3. Run query in Supabase to verify: `SELECT * FROM products WHERE ...`

## Related Documentation

- **Content Enrichment:** `development/content-enrichment.md` - Details on AI content generation
- **Tech Stack:** `architecture/techStack.md` - Frontend framework and tools
- **Patterns:** `architecture/patterns.md` - Design principles and code organization
- **Quick Start:** `core/quickstart.md` - Key commands reference
