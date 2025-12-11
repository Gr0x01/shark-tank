# New SEO Page - Quick Start

## Step 1: Choose Your Template

**ArticlePage** → Editorial content, guides, how-tos
- Examples: how-to-apply, success-stories
- Template: `.templates/seo-page-template.md` (Pattern 1)

**FilteredListingPage** → Product listings with narrative intro
- Examples: still-in-business, out-of-business
- Template: `.templates/seo-page-template.md` (Pattern 2)

## Step 2: Copy-Paste Template

1. Open `.templates/seo-page-template.md`
2. Copy the **entire** template for your pattern
3. Create new file: `src/app/your-slug/page.tsx`
4. Paste template code

## Step 3: Find & Replace

Replace these constants at the top:
```tsx
const PAGE_SLUG = 'your-page-slug'  // e.g., 'success-stories'
const PAGE_TITLE = 'Your Page Title' // e.g., 'Success Stories'
```

Update breadcrumb name:
```tsx
{ name: PAGE_TITLE } // Should match PAGE_TITLE constant
```

## Step 4: Customize Filters (FilteredListingPage only)

```tsx
getProducts({ status: 'active', limit: 500 })
// Change to whatever filter you need
```

## Step 5: Generate Content

```bash
npx tsx scripts/enrich-seo-pages.ts --page your-page-slug
```

## Step 6: Verify

```bash
npm run dev -- -p 3004
# Visit http://localhost:3004/your-page-slug
```

---

## ⚠️ CRITICAL RULES

1. **DO NOT modify the component structure** - Use templates exactly as-is
2. **DO NOT create custom layouts** - Use ArticlePage or FilteredListingPage only
3. **ALWAYS wrap in SEOErrorBoundary**
4. **ALWAYS include both schema.org scripts** (breadcrumb + article/collection)
5. **ALWAYS use loadSEOContent()** - Never hardcode content

---

## Common Mistakes

❌ Forgetting to update PAGE_SLUG in the error message code block
❌ Using `type: 'article'` for listing pages (should be 'website')
❌ Using `createArticleSchema` for listing pages (should be createCollectionPageSchema)
❌ Not using Promise.allSettled for parallel data fetching
❌ Modifying the HTML sanitization config in dangerouslySetInnerHTML
