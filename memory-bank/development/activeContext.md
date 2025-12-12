---
Last-Updated: 2025-12-13
Maintainer: RB
Status: Phase 3 Complete - Ready for Launch
---

# Active Context: tankd.io

## Current Status
- **Phase**: 3 - COMPLETE ✅
- **Mode**: Production ready - all core features shipped
- **Focus**: Launch preparation, SEO optimization, monitoring

## Narrative Refresh System (Built Dec 12)

Database trigger automatically flags products for narrative re-enrichment when status changes:
- **Trigger**: `trigger_narrative_refresh_on_status_change` sets `narrative_version = 0` when `status` column changes
- **Helper**: `flag_product_for_narrative_refresh(product_id)` for manual flagging
- **Enrichment**: Run `npx tsx scripts/enrich-narratives.ts --limit 10` to regenerate flagged narratives
- **Cost**: ~$0.001/product for narrative refresh with gpt-4.1-mini

This ensures product narratives stay accurate when business status changes (active → out_of_business).

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

## Vercel Cron Automation (Built Dec 12)

**Automated daily enrichment for products with unknown deal outcomes.**

### Overview
Products created during Friday episodes initially have `deal_outcome = 'unknown'`. While the manual `update-deal.ts` script handles most updates, this automation catches any missed products by automatically searching for deal information daily.

### Schedule
- **Frequency**: Daily at 10am UTC (5am ET)
- **Rationale**:
  - Episodes air Friday 8pm ET
  - Deal info typically published Saturday-Sunday on blogs/news sites
  - Running daily for 6 days catches most updates
  - Early morning timing captures fresh content for SEO

### Technical Implementation

**Files:**
- `vercel.json` - Cron configuration (schedule: `0 10 * * *`)
- `src/app/api/cron/daily-enrich/route.ts` - API endpoint handler

**Flow:**
1. Vercel triggers cron at 10am UTC
2. Calls `/api/cron/daily-enrich` with `CRON_SECRET` header
3. API route verifies secret, executes: `npx tsx scripts/daily-enrich-pending.ts --limit 20`
4. Script searches for unknown deals using Tavily + OpenAI
5. High-confidence results update database
6. Logs sent to Vercel dashboard

**Security:**
- `CRON_SECRET` environment variable required (set in Vercel dashboard)
- API route validates `Authorization: Bearer ${CRON_SECRET}` header
- Vercel automatically injects secret into cron requests

### Configuration

**Environment Variables (Vercel):**
```bash
CRON_SECRET=...                      # Cron authentication
NEXT_PUBLIC_SUPABASE_URL=...        # Already exists
SUPABASE_SERVICE_ROLE_KEY=...       # Already exists
TAVILY_API_KEY=...                  # Already exists
OPENAI_API_KEY=...                  # Already exists
```

**Retry Logic:**
- Max 7 attempts per product (tracked in `deal_search_attempts` column)
- 24h cooldown between retries
- Only updates with high-confidence results (preserves data quality)

### Monitoring

**Vercel Dashboard:**
1. Navigate to Vercel Dashboard → Project → Logs
2. Filter by `/api/cron/daily-enrich`
3. Check for successful execution logs
4. Review any errors or failures

**Manual Testing:**
```bash
# Test endpoint directly (get CRON_SECRET from Vercel)
curl -X GET "https://tankd.io/api/cron/daily-enrich" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

**Expected response:**
```json
{
  "success": true,
  "message": "Daily enrichment completed successfully",
  "timestamp": "2025-12-12T10:00:00.000Z",
  "output": "... enrichment logs ..."
}
```

### Cost & Performance
- **Compute**: Included in Vercel Pro plan ($20/month)
- **API calls**: ~$0.01-0.10 per run (Tavily + OpenAI)
- **Monthly cost**: ~$1-4 in API calls
- **Execution time**: ~1-4 minutes (depending on number of products)
- **Timeout**: 5 minutes max (configured in route)

### Integration with Workflow
This automation integrates seamlessly with the Friday episode workflow:
1. Run `new-episode.ts` → Creates products with unknown outcomes
2. Watch episode, run `update-deal.ts` → Manual updates
3. **Automated cron catches anything missed** (no intervention needed)
4. Products automatically transition from "Deal Pending" to confirmed outcomes

### Troubleshooting

**Cron not running?**
- Check Vercel dashboard for cron job status
- Verify `vercel.json` is in repository root
- Ensure latest deployment includes `vercel.json`

**Authentication errors?**
- Verify `CRON_SECRET` is set in Vercel environment variables
- Check secret matches between Vercel and API route

**Script failures?**
- Check Vercel logs for error messages
- Verify all environment variables are set correctly
- Test script locally: `npx tsx scripts/daily-enrich-pending.ts --dry-run`

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

## Shark Enrichment & Retired Status (Built Dec 12)

**All 47 sharks enriched with narrative content:**
- Cost: $0.0555 (50 enrichment runs, includes some duplicates)
- 5 narrative sections per shark: biography, investment_philosophy, shark_tank_journey, notable_deals, beyond_the_tank
- Enrichment command: `npx tsx scripts/enrich-shark-narratives.ts --all`

**Retired shark tracking:**
- Database field `is_retired` added to sharks table
- Mark Cuban and Kevin Harrington marked as retired
- Retired badge displays on shark pages: "No Longer on Shark Tank"
- Badge styling: Subtle gray pill badge next to shark name

**To mark additional retired sharks:**
```sql
UPDATE sharks SET is_retired = TRUE WHERE slug = 'shark-slug';
```

## Page Template System (Built Dec 12)

Standardized page generation for SEO content pages to ensure consistency and prevent implementation errors.

**Problem Solved:** Coding agents were creating inconsistent page implementations with varying component structures, missing SEO metadata, and incorrect schema.org markup.

**Solution Components:**
- **Generator Script**: `scripts/create-seo-page.ts` enforces consistent page structure
- **ArticlePage**: Component for editorial/guide content (2-col layout with optional sidebar)
- **FilteredListingPage**: Component for product listings with narrative content
- **Template Docs**: `.templates/` directory contains reference documentation

**Creating New Pages:**
```bash
# Article pages (guides, how-tos)
npx tsx scripts/create-seo-page.ts article "your-slug" "Your Title"

# Listing pages (filtered products)
npx tsx scripts/create-seo-page.ts listing "your-slug" "Your Title"

# Then generate content
npx tsx scripts/enrich-seo-pages.ts --page your-slug
```

**Example Pages:**
- `/how-to-apply` - ArticlePage for application guide
- `/success-stories` - ArticlePage with related products sidebar
- `/still-in-business` - FilteredListingPage for active businesses
- `/out-of-business` - FilteredListingPage for failed businesses

**Key Patterns:**
- Metadata generation (SEO, OpenGraph, Twitter)
- Schema.org structured data (breadcrumb + article/collection)
- SEOErrorBoundary for graceful error handling
- DOMPurify HTML sanitization
- Content loading via `loadSEOContent()` from `seo_pages` table

**Documentation:** See `development/page-templates.md` for comprehensive guide

**Template Files:** `.templates/README.md`, `.templates/NEW-PAGE-CHECKLIST.md`, `.templates/seo-page-template.md`

## Recent Migrations
- `00005_deal_search_tracking.sql` - Adds `deal_search_attempts` column for daily cron
- `00006_shark_co_investors_function.sql` - Function for shark partnership data
- `00006_shark_narrative_content.sql` - Adds narrative fields to sharks table
- `00007_narrative_refresh_on_status_change.sql` - Auto-flags narrative refresh on status change
- `00008_shark_retired_status.sql` - Adds `is_retired` field for retired sharks

## Manual Seed Products Import (Dec 13, 2025)

**Problem:** 18 manually curated "greatest hits" products from `seed-products.json` were never imported into the database. The original `seed-products.ts` script was incomplete (never wrote to database).

**Solution:** Created `scripts/import-seed-products.ts` to import the seed file.

**Products Added:**
- Bombas ($2B lifetime revenue, Daymond John)
- Scrub Daddy (highest revenue ST product)
- Ring (no deal, later sold to Amazon for $1B)
- Squatty Potty, Tipsy Elves, Groovebook, Simply Fit Board
- BeatBox Beverages, Wicked Good Cupcakes, Sleep Styler
- Dude Wipes, LovePop, The Bouqs Company, Breathometer
- Cousins Maine Lobster, Bantam Bagels, Spatty, Swim Brief

**Enrichment:**
- Batch enrichment: $0.0156 (Tavily + OpenAI for product details)
- Narrative enrichment: $0.0249 (SEO long-form content)
- Total cost: $0.0405

**New Total:** 607 products (was 589), all fully enriched with narrative content.

## Manual Seed Products Import - Round 2 (Dec 13, 2025)

**Scope:** Comprehensive audit of Seasons 9-16 identified missing major products.

**Problem:** Database had systematic gaps in S9-S16 coverage, missing flagship successes:
- Poppi ($1.95B PepsiCo acquisition 2025) - one of biggest Shark Tank acquisitions ever
- The Original Comfy ($550M+ lifetime sales) - Barbara's mega-deal
- Basepaws (Zoetis acquisition $50M+ 2022)
- 8 other major deals from seasons 9-12

**Root Cause:** allsharktankproducts.com scraper source incomplete for recent seasons.

**Discovery:** 17 products identified in initial research, but 6 already existed in database:
- Already present: EverlyWell, LARQ, RoboBurger, Psyonic, Goumi Kids, Swimply
- **Actually added: 11 new products**

**Products Added (11 total):**

1. **Mother Beverage** (Poppi) - S10E5
   - Deal: $400K for 25% from Rohan Oza (guest shark)
   - Status: Acquired by PepsiCo for $1.95B (March 2025)
   - Annual Revenue: $50M

2. **Basepaws** - S10E10
   - Deal: $250K for 10% from Kevin O'Leary + Robert Herjavec
   - Status: Acquired by Zoetis for $50M+ (June 2022)
   - Annual Revenue: $3.8M

3. **Boost Oxygen** - S11E1
   - Deal: $1M loan + 6.25% equity from Kevin O'Leary
   - Status: Active
   - Deal includes loan at 7.5% interest

4. **Blueland** - S11E1
   - Deal: $270K for 3% + $0.50 royalty from Kevin O'Leary
   - Status: Active
   - Lifetime Revenue: $170M+

5. **Wild Earth** - S10E3
   - Deal: $550K for 10% from Mark Cuban
   - Status: Out of business (Chapter 11 bankruptcy 2025)
   - Annual Revenue: $21M before bankruptcy

6. **The Original Comfy** - S9E13
   - Deal: $50K for 30% from Barbara Corcoran
   - Status: Active
   - Lifetime Revenue: $550M+

7. **Bala Bangles** - S11E7
   - Deal: $900K for 30% from Mark Cuban + Maria Sharapova
   - Status: Active
   - Annual Revenue: $29M

8. **Chirp** - S12E12
   - Deal: $900K for 2.5% from Lori Greiner (fell through)
   - Status: Active
   - Company Valuation: $36M (highest in S12)

9. **Pair Eyewear** - S11E14
   - Deal: $400K for 5% from Lori Greiner + Katrina Lake
   - Status: Active
   - Annual Revenue: $9M

10. **Aura Bora** - S12E11
    - Deal: $200K for 15% from Robert Herjavec
    - Status: Active
    - Company Valuation: $20M

11. **Genius Juice** - S11
    - Deal: $300K for 20% from Barbara + Mark (fell through)
    - Status: Out of business

**Enrichment Costs:**
- Batch enrichment: $0.0096 (11 products)
- Narrative enrichment: $0.0151 (11 products)
- **Total cost: $0.0247** (under budget of $0.60-0.85)

**New Total:** 618 products (was 607, +11)

**Season Coverage Improvement:**
- S9: +1 (The Original Comfy)
- S10: +3 (Poppi, Basepaws, Wild Earth)
- S11: +5 (Blueland, Boost Oxygen, Bala Bangles, Pair Eyewear, Genius Juice)
- S12: +2 (Chirp, Aura Bora)

**Notable Findings:**
- 2 deals fell through (Chirp, Genius Juice)
- 2 products acquired by major companies (Poppi by PepsiCo, Basepaws by Zoetis)
- 1 bankruptcy (Wild Earth - still operating under Ch. 11)
- The Original Comfy generated $550M+ - one of highest revenue ST products
