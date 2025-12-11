# Page Templates

This directory contains standardized templates for creating new pages in the tankd.io app.

## Quick Start

**Don't create pages manually!** Use the generator script instead:

```bash
# For editorial/guide pages
npx tsx scripts/create-seo-page.ts article "your-slug" "Your Page Title"

# For product listing pages
npx tsx scripts/create-seo-page.ts listing "your-slug" "Your Page Title"
```

Then generate content:
```bash
npx tsx scripts/enrich-seo-pages.ts --page your-slug
```

## Files

- **`NEW-PAGE-CHECKLIST.md`** - Quick reference for creating pages
- **`seo-page-template.md`** - Full template documentation with copy-paste code

## Why Use the Generator?

1. **Consistency** - Every page follows exact same structure
2. **No mistakes** - Prevents typos in imports, schemas, metadata
3. **Fast** - 1 command instead of 100 lines of copy-paste
4. **Safe** - Validates slug format and prevents overwrites

## Component Patterns

### ArticlePage
Used for: Editorial content, guides, how-tos

**Examples:**
- `/how-to-apply` - Guide for applying to Shark Tank
- `/success-stories` - Article about successful products

**Props:**
- `title` - Page H1
- `description` - Optional subtitle
- `introduction` - HTML content (first section)
- `sections` - Array of {heading, content}
- `relatedProducts` - Optional sidebar products

### FilteredListingPage
Used for: Product listings with narrative content

**Examples:**
- `/still-in-business` - Active products
- `/out-of-business` - Failed products

**Props:**
- `title` - Page H1
- `introduction` - HTML content (intro section)
- `sections` - Optional narrative sections
- `products` - Products to display
- `stats` - {total, percentage}

## Rules

### DO:
✅ Use the generator script
✅ Customize product filters in listing pages
✅ Follow existing component patterns
✅ Generate content after creating page

### DON'T:
❌ Create custom layouts
❌ Modify component structure
❌ Skip SEOErrorBoundary wrapper
❌ Hardcode content
❌ Forget schema.org structured data

## Troubleshooting

**Page already exists?**
- Delete the existing page first
- Or use a different slug

**Content not showing?**
- Run: `npx tsx scripts/enrich-seo-pages.ts --page your-slug`
- Check database: `SELECT * FROM seo_pages WHERE slug = 'your-slug'`

**Wrong page type?**
- Delete `src/app/your-slug/page.tsx`
- Re-run generator with correct type

## Need Help?

1. Read `NEW-PAGE-CHECKLIST.md` for quick reference
2. Read `seo-page-template.md` for full documentation
3. Look at existing pages in `/src/app/`:
   - `how-to-apply/page.tsx` (ArticlePage example)
   - `still-in-business/page.tsx` (FilteredListingPage example)
