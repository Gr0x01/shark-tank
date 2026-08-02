# Friday Episode Workflow

How a new Shark Tank episode gets onto the site, plus the full command reference for content operations.

> [!IMPORTANT]
> Always run the dev server on **port 3004** for this project (`npm run dev -- -p 3004`) to avoid conflicts with other projects.

## The Friday Process

1. Episode airs Friday 8pm ET
2. Find product names (Google, Reddit r/sharktank, competitor site)
3. Run `new-episode.ts` with product names → pages go live with backstory + photos + IndexNow submitted
4. Watch the episode, note deals
5. Run `update-deal.ts` for each product as you watch
6. Automated systems handle the rest (narrative refresh, missed-deal search — see below)
7. **The next day**, run `enrich-product-meta.ts` to give the new products their search titles and descriptions

```bash
# 1. Create products for the new episode (runs enrichment for backstory)
npx tsx scripts/new-episode.ts "Product A" "Product B" --season 17 --episode 8

# 2. Add deal details after watching
npx tsx scripts/update-deal.ts "Product A" --deal --amount 200000 --equity 20 --sharks "Lori"
npx tsx scripts/update-deal.ts "Product A" --no-deal
npx tsx scripts/update-deal.ts "Product A" --deal --ask 100000 --ask-equity 10 --amount 150000 --equity 25 --sharks "Mark" "Barbara"

# 3. Next day, once narratives have settled — writes only products that have none yet
npx tsx scripts/enrich-product-meta.ts
```

> [!IMPORTANT]
> **Wait for the narrative before generating meta.** `enrich-product-meta.ts` writes its titles and descriptions from `narrative_content`, so running it before the narrative regenerates produces thin, generic copy. Narratives settle about an hour after your last deal edit. A product with no meta still renders — it falls back to the old templates — so being late costs nothing, but being early bakes in weak copy.

> [!TIP]
> **Multiple deal edits are fine.** Each edit resets a 1-hour cooldown timer; once an hour passes with no changes, the narrative regenerates automatically. No wasted regenerations while you're editing during the live episode.

## What Runs Automatically

No manual intervention needed — full details in `.koda/memory/automation.md`:

- **Episode detection** (6am UTC daily): checks TVMaze for new episodes, scrapes product names, creates + enriches products, submits to IndexNow. Catches any Friday you miss. (~$0.20/mo)
- **Daily deal enrichment** (10am UTC): searches the web for unknown deal outcomes and fills them in. (~$3.60/mo)
- **Narrative refresh processing** (every 3 hours): flags products whose deal-edit cooldown expired. (~$0.02/mo)
- **Database triggers**: status change → immediate narrative refresh; deal change → delayed refresh with 1-hour cooldown

Monitor at: Vercel Dashboard → Functions → filter by `/api/cron/`.

## Batch Operations

```bash
npx tsx scripts/batch-enrich.ts --concurrency 20
npx tsx scripts/enrich-narratives.ts --limit 10              # Product narratives
npx tsx scripts/enrich-shark-narratives.ts --shark "Mark"    # One shark
npx tsx scripts/enrich-shark-narratives.ts --all             # All sharks
npx tsx scripts/scrape-photos.ts                             # Photos for products missing them
npx tsx scripts/scrape-photos.ts --dry-run                   # Preview without scraping

# Search titles + meta descriptions (skips products that already have them)
npx tsx scripts/enrich-product-meta.ts                       # Everything still missing meta
npx tsx scripts/enrich-product-meta.ts --dry-run --limit 5   # Preview the copy, write nothing
npx tsx scripts/enrich-product-meta.ts --slug some-product   # Rewrite one product
npx tsx scripts/enrich-product-meta.ts --force --limit 50    # Rewrite products that already have meta

# Backfill missed episodes (gap recovery when the cron's 72-hour lookback misses one)
npx tsx scripts/backfill-episodes.ts 17:14 17:15 17:16       # Full pipeline: discovery + enrich + photo + narrative + IndexNow

# Daily safety net (also runs via cron)
npx tsx scripts/daily-enrich-pending.ts
```

## Content Maintenance

```bash
# Regenerate narratives for flagged products
npx tsx scripts/enrich-narratives.ts --limit 10

# Process scheduled narrative refreshes (normally every 3 hours via cron)
npx tsx scripts/process-narrative-refreshes.ts
```

Useful SQL checks:

```sql
-- Products needing narrative refresh
SELECT id, name, status FROM products WHERE narrative_version = 0;

-- Products with scheduled refreshes pending
SELECT id, name, narrative_refresh_scheduled_at FROM products
WHERE narrative_refresh_scheduled_at IS NOT NULL;

-- Manually flag a product for refresh
SELECT flag_product_for_narrative_refresh('product-uuid');
```

## New SEO Pages

```bash
# Article page (guides, how-tos)
npx tsx scripts/create-seo-page.ts article "how-to-apply" "How to Apply"

# Listing page (filtered products)
npx tsx scripts/create-seo-page.ts listing "biggest-deals" "Biggest Deals"

# Then generate content
npx tsx scripts/enrich-seo-pages.ts --page how-to-apply
```

## IndexNow

Auto-submitted when new products are created (both manual and cron). Manual bulk submission:

```bash
npx tsx scripts/submit-indexnow.ts           # Submit all URLs
npx tsx scripts/submit-indexnow.ts --dry-run # Preview
```
