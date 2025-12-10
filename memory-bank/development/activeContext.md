---
Last-Updated: 2025-12-10
Maintainer: RB
Status: Phase 2 - Data Ingestion
---

# Active Context: Shark Tank Products

## Current Status
- **Phase**: 2 - Data Ingestion Infrastructure
- **Mode**: LLM-based product discovery
- **Focus**: Building ingestion pipeline to discover products from web sources

## Phase 2 Tasks

### Completed
- [x] Memory bank setup
- [x] Next.js project initialized
- [x] Database schema created (products, sharks, episodes, categories)
- [x] LLM-based product discovery system built
- [x] Manual seed with 20 well-known products
- [x] Tavily + OpenAI integration tested
- [x] Discovery tested on Seasons 1-3 (77 products found)

### In Progress
- [ ] Apply search_cache migration to Supabase
- [ ] Run full discovery on all 16 seasons

### Next Up
- [ ] Add database write logic to seed script
- [ ] Build product status enrichment service
- [ ] Build frontend pages

## Data Ingestion Architecture

### Why LLM Discovery (Not Scraping)
Wikipedia doesn't have structured product tables for Shark Tank.
Using Tavily web search + OpenAI LLM synthesis instead.

### Discovery Flow
```
1. searchSeasonProducts(season) → Tavily search with caching
2. LLM extracts structured product data from search results
3. Merge with manual seed (dedupe by slug)
4. Dry-run for testing, then DB writes
```

### Key Scripts
```
scripts/
├── seed-products.ts                    # Main entry point
├── data/
│   └── seed-products.json              # 20 manual seed products
└── ingestion/enrichment/
    ├── services/
    │   └── product-discovery-service.ts # LLM discovery
    └── shared/
        ├── tavily-client.ts            # Tavily API + caching
        ├── synthesis-client.ts         # OpenAI LLM
        ├── token-tracker.ts            # Cost tracking
        ├── result-parser.ts            # JSON extraction
        └── retry-handler.ts            # Retry logic
```

### Usage
```bash
# Manual seed only (no API calls)
npx tsx scripts/seed-products.ts --dry-run --only-seed

# Discover single season
npx tsx scripts/seed-products.ts --dry-run --season 1

# Discover first N seasons
npx tsx scripts/seed-products.ts --dry-run --limit 3

# Full run (all 16 seasons)
npx tsx scripts/seed-products.ts --dry-run --limit 16
```

### Cost Estimates
- ~$0.002 per season for discovery
- ~$0.02 total for all 16 seasons
- Tavily results cached in `search_cache` table

## Key Decisions Made
- [x] Data source: Tavily + LLM (not Wikipedia scraping)
- [x] Manual seed of famous products as baseline
- [ ] Status verification: TBD (will use similar Tavily + LLM approach)
- [ ] Photo sourcing: TBD

## Environment Requirements
```
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
TAVILY=...
OPENAI_API_KEY=...
```
