---
Last-Updated: 2025-12-13
Maintainer: RB
Status: Live - Awaiting Google Indexing
---

# Quickstart: tankd.io

## Current Status
- **Phase**: 3 - COMPLETE ✅
- **Version**: 1.0.0
- **Environment**: LIVE at https://tankd.io
- **Focus**: Google indexing, SEO monitoring, external link building

## Key Commands
```bash
# Development
npm run dev -- -p 3004   # Start development server (localhost:3004)
npm run build            # Build for production
npm run lint             # Run ESLint
npm run type-check       # Run TypeScript checks

# Testing
npm run test:e2e     # Run Playwright tests
npm run test:e2e:ui  # Interactive test mode

# === NEW EPISODE WORKFLOW (Fridays) ===
# 1. Create products for new episode (runs enrichment for backstory)
npx tsx scripts/new-episode.ts "Product A" "Product B" --season 17 --episode 8

# 2. Add deal details after watching
npx tsx scripts/update-deal.ts "Product A" --deal --amount 200000 --equity 20 --sharks "Lori"
npx tsx scripts/update-deal.ts "Product A" --no-deal
npx tsx scripts/update-deal.ts "Product A" --deal --ask 100000 --ask-equity 10 --amount 150000 --equity 25 --sharks "Mark" "Barbara"

# 3. Daily safety net (cron)
npx tsx scripts/daily-enrich-pending.ts

# === BATCH OPERATIONS ===
npx tsx scripts/batch-enrich.ts --concurrency 20
npx tsx scripts/enrich-narratives.ts --limit 10              # Product narratives
npx tsx scripts/enrich-shark-narratives.ts --shark "Mark"    # Shark narratives
npx tsx scripts/enrich-shark-narratives.ts --all             # All sharks

# === CONTENT MAINTENANCE ===
# When product status changes, narrative is auto-flagged for immediate refresh (database trigger)
# When deal details change, narrative is scheduled for refresh 1 hour later (cooldown system)

# Regenerate narratives for flagged products:
npx tsx scripts/enrich-narratives.ts --limit 10

# Process scheduled narrative refreshes (normally runs every 3 hours via cron):
npx tsx scripts/process-narrative-refreshes.ts

# Check which products need narrative refresh:
# SELECT id, name, status FROM products WHERE narrative_version = 0;

# Check which products have scheduled refreshes pending:
# SELECT id, name, narrative_refresh_scheduled_at FROM products WHERE narrative_refresh_scheduled_at IS NOT NULL;

# Manually flag a product for narrative refresh (if needed):
# SELECT flag_product_for_narrative_refresh('product-uuid');

# === NEW SEO PAGES ===
# Create a new article page (guides, how-tos)
npx tsx scripts/create-seo-page.ts article "how-to-apply" "How to Apply"

# Create a new listing page (filtered products)
npx tsx scripts/create-seo-page.ts listing "biggest-deals" "Biggest Deals"

# Then generate content
npx tsx scripts/enrich-seo-pages.ts --page how-to-apply
```

**IMPORTANT**: Always use port 3004 for this project to avoid conflicts.

## Friday Episode Workflow
1. Episode airs Friday 8pm ET
2. Find product names (Google, Reddit r/sharktank, competitor)
3. Run `new-episode.ts` with product names → pages go live with backstory
4. Watch episode, note deals
5. Run `update-deal.ts` for each product as you watch → deal details added
   - **Multiple updates are OK!** System batches them together with 1-hour cooldown
   - Narrative regeneration happens automatically 1+ hours after your last edit
6. **Automated systems handle the rest:**
   - Every 3 hours: Check for products ready for narrative refresh (1hr+ since last edit)
   - Daily at 10am UTC: Search for unknown deal outcomes & regenerate narratives

**Note:** The delayed narrative refresh system prevents wasted regenerations when you're making multiple edits during the episode. Your edits trigger a 1-hour cooldown timer that resets with each change. Once 1 hour passes with no changes, the product is automatically flagged for narrative refresh.

## Automated Systems

**No manual intervention required** - these run automatically:

### Vercel Cron Jobs
1. **Automated Episode Detection** (6am UTC / 1am ET)
   - Checks TVMaze API for new episodes aired in last 72 hours
   - Scrapes competitor site for product names
   - Auto-creates products and runs enrichment
   - **Catches missed episodes automatically**
   - Cost: ~$0.20/month

2. **Daily Deal Enrichment** (10am UTC / 5am ET)
   - Searches for products with unknown deal outcomes
   - Updates deal terms, amounts, sharks
   - Cost: ~$3.60/month (Tavily + OpenAI)

3. **Narrative Refresh Processing** (Every 3 hours)
   - Flags products after 1-hour cooldown from deal edits
   - Batches multiple edits into single regeneration
   - Cost: ~$0.02/month

### Database Triggers
1. **Status Change → Immediate Refresh**
   - When product status changes (active → closed), flag for immediate narrative refresh

2. **Deal Change → Delayed Refresh**
   - When deal fields change, schedule refresh 1 hour later
   - Timer resets on each edit (batching behavior)

3. **Updated-At Timestamp**
   - Automatically tracks last modification time

**Monitoring**: Vercel Dashboard → Functions → Filter by route
**Full Documentation**: [Automation Systems](../development/automation.md)

## Quick Links
- [Project Brief](./projectbrief.md)
- [Tech Stack](../architecture/techStack.md)
- [Active Context](../development/activeContext.md)
- [Progress Log](../development/progress.md)
- [Automation Systems](../development/automation.md) ⚙️
- [Content Enrichment Guide](../development/content-enrichment.md)
- [Architecture Patterns](../architecture/patterns.md)

## Database Status
- **Products**: 618 total (306 deals, 243 no deal, 69 fell through)
  - ALL 618 enriched with narrative content
  - Includes 29 manually curated "greatest hits" (Bombas, Poppi, Scrub Daddy, The Comfy, etc.)
- **Sharks**: 47 (8 main + 39 guest)
  - All have photos in Supabase Storage
  - ALL 47 enriched with narrative content
  - 2 marked as retired (Mark Cuban, Kevin Harrington)
- **Schema**: Deployed with 10 migrations (00001-00010)

## Environment Requirements
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
TAVILY_API_KEY=...
OPENAI_API_KEY=...
CRON_SECRET=...  # For Vercel Cron authentication
```

## Project Overview
tankd.io - comprehensive database of every product pitched on Shark Tank with:
- Current business status (active/closed)
- Deal details (shark, amount, equity)
- Rich narrative content for products and sharks
- Where to buy (Amazon, retail, direct)
- Freshness tracking (last verified dates)
- Weekly episode ingestion workflow

## Frontend Status
All core pages shipped:
- Home page (latest episode + season products)
- Product listing (with advanced filters + search)
- Shark listing (with leaderboard)
- Product detail pages (with narrative content)
- Shark portfolio pages (with narrative content)
- Category, season, episode pages
- Full SEO metadata and structured data
