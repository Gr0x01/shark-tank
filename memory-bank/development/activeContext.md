---
Last-Updated: 2025-12-12
Maintainer: RB
Status: Phase 3 Complete - Ready for Launch
---

# Active Context: Shark Tank Products

## Current Status
- **Phase**: 3 - COMPLETE ✅
- **Mode**: Production ready - all core features shipped
- **Focus**: Launch preparation, SEO optimization, monitoring

## New Episode Workflow (Built Dec 11)

Scripts for ingesting new episodes as they air on Fridays:

### 1. Create Products for New Episode
```bash
# Create products and run enrichment for backstory
npx tsx scripts/new-episode.ts "Product A" "Product B" --season 17 --episode 8

# Dry run to preview
npx tsx scripts/new-episode.ts "Product A" --season 17 --episode 8 --dry-run

# Skip enrichment (just create records)
npx tsx scripts/new-episode.ts "Product A" --season 17 --episode 8 --skip-enrich
```

### 2. Add Deal Details After Watching
```bash
# Simple equity deal
npx tsx scripts/update-deal.ts "Product A" --deal --amount 200000 --equity 20 --sharks "Lori"

# No deal
npx tsx scripts/update-deal.ts "Product A" --no-deal

# Multi-shark with ask info
npx tsx scripts/update-deal.ts "Product A" --deal --ask 100000 --ask-equity 10 \
  --amount 150000 --equity 25 --sharks "Mark" "Barbara"

# Royalty deal
npx tsx scripts/update-deal.ts "Product A" --deal --amount 100000 --royalty 5 --sharks "Kevin"

# Deal fell through
npx tsx scripts/update-deal.ts "Product A" --fell-through
```

### 3. Daily Safety Net (Cron)
```bash
# Re-search for deal info on products with unknown outcomes
npx tsx scripts/daily-enrich-pending.ts

# With options
npx tsx scripts/daily-enrich-pending.ts --limit 5 --dry-run
npx tsx scripts/daily-enrich-pending.ts --force  # Ignore age/attempt limits
```

### Friday Workflow
1. Episode airs Friday 8pm ET
2. Find product names (Google, Reddit r/sharktank, competitor sites)
3. Run `new-episode.ts` with product names → pages go live with backstory
4. Watch episode, note deals
5. Run `update-deal.ts` for each product → deal details added
6. Daily cron catches anything missed

### Data Sources for Product Names
- **Primary**: You watch/find products manually
- **Backup**: Scrape allsharktankproducts.com for new listings
- **Reddit**: r/sharktank episode threads (mod stopped posting structured threads after S17E4, but comments still useful)

## Phase 2 Completed

### Data Pipeline
- [x] 589 products scraped from allsharktankproducts.com
- [x] All products seeded to Supabase
- [x] All 589 products enriched with LLM (Tavily + OpenAI)
- [x] Complex deal types supported (royalty, contingent, multi-shark)

### Infrastructure Built
- [x] Playwright scraper with incremental saves and resume
- [x] Tavily search client with Supabase caching
- [x] OpenAI synthesis with Zod validation
- [x] Batch enrichment with parallel processing (15 concurrent)
- [x] Token/cost tracking
- [x] New episode ingestion workflow (3 scripts)

## Key Scripts

```bash
# === NEW EPISODE WORKFLOW ===
npx tsx scripts/new-episode.ts "Product" --season 17 --episode 8
npx tsx scripts/update-deal.ts "Product" --deal --amount X --equity Y --sharks "Shark"
npx tsx scripts/daily-enrich-pending.ts

# === BATCH OPERATIONS ===
npx tsx scripts/batch-enrich.ts --concurrency 20
npx tsx scripts/batch-enrich.ts --limit 10 --dry-run

# === SCRAPING ===
npx tsx scripts/scrapers/allsharktankproducts.ts --resume
npx tsx scripts/seed-from-scrape.ts

# === SINGLE PRODUCT ===
npx tsx scripts/enrich-product.ts "Scrub Daddy"
```

## Data Schema Highlights

### Deal Types
`equity | royalty | loan | equity_plus_royalty | equity_plus_loan | contingent | unknown`

### Deal Outcomes
`deal | no_deal | deal_fell_through | unknown`

### Enriched Fields
- founders, founderStory
- askingAmount, askingEquity
- dealType, dealAmount, dealEquity
- royaltyPercent, royaltyTerms
- dealOutcome, status
- websiteUrl, amazonUrl
- lifetimeRevenue, annualRevenue, revenueYear
- pitchSummary
- sharks (via product_sharks junction table)
- deal_search_attempts (for daily cron tracking)

## Phase 3: Frontend - COMPLETE ✅

### Shipped Features
- [x] Home page with latest episode + season sections
- [x] Product listing page with advanced filters
- [x] Product detail pages with narrative content
- [x] Shark listing page with leaderboard
- [x] Shark portfolio pages with narrative content
- [x] Search functionality (integrated with filters)
- [x] Category pages
- [x] Season/episode pages
- [x] SEO metadata and structured data
- [x] Narrative content generation for products (589 enriched)
- [x] Narrative content generation for sharks

### Phase 4: Next Steps (Future)
- [ ] Product photo scraping/enrichment
- [ ] Analytics integration (PostHog)
- [ ] Affiliate link management
- [ ] Performance monitoring
- [ ] Weekly episode automation (cron jobs)

## Environment Requirements
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
TAVILY_API_KEY=...
OPENAI_API_KEY=...
```

## Recent Migrations
- `00005_deal_search_tracking.sql` - Adds `deal_search_attempts` column for daily cron
- `00006_shark_co_investors_function.sql` - Function for shark partnership data
- `00006_shark_narrative_content.sql` - Adds narrative fields to sharks table
