---
Last-Updated: 2025-12-10
Maintainer: RB
Status: Phase 2 - Data Ingestion Complete
---

# Active Context: Shark Tank Products

## Current Status
- **Phase**: 2 - Data Ingestion Complete
- **Mode**: Production ready data
- **Focus**: Frontend development

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

## Key Scripts

```bash
# Scrape products (with resume capability)
npx tsx scripts/scrapers/allsharktankproducts.ts --resume

# Seed scraped data to DB
npx tsx scripts/seed-from-scrape.ts

# Enrich single product (testing)
npx tsx scripts/enrich-product.ts "Scrub Daddy"

# Batch enrich all pending products
npx tsx scripts/batch-enrich.ts --concurrency 20
npx tsx scripts/batch-enrich.ts --limit 10 --dry-run
```

## Data Schema Highlights

### Deal Types
`equity | royalty | loan | equity_plus_royalty | equity_plus_loan | contingent | unknown`

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

## Next Phase: Frontend

### Immediate
- [ ] Build product listing page
- [ ] Build product detail page
- [ ] Build shark portfolio pages
- [ ] Basic search/filter

### Later
- [ ] Scrape product photos from websites
- [ ] Generate SEO content/narratives
- [ ] Analytics integration

## Environment Requirements
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
TAVILY_API_KEY=...
OPENAI_API_KEY=...
```
