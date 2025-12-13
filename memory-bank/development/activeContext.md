---
Last-Updated: 2025-12-13
Maintainer: RB
Status: Live - Awaiting Google Indexing
---

# Active Context: tankd.io

## Current Status
- **Environment**: LIVE at https://tankd.io
- **Data**: 618 products, 47 sharks (all enriched with narrative content)
- **Focus**: Google indexing, external link building, Friday episode workflow

## Current Blockers
- None - SEO audit passed (Dec 13), no technical blockers for Google indexing

## Weekly Episode Workflow

### Friday Episode Process (Quick Reference)
See `core/quickstart.md` for full command reference.

1. **Create products** (run before/during episode):
   ```bash
   npx tsx scripts/new-episode.ts "Product A" "Product B" --season 17 --episode 8
   ```

2. **Update deals** (after watching episode):
   ```bash
   npx tsx scripts/update-deal.ts "Product A" --deal --amount 200000 --equity 20 --sharks "Lori"
   npx tsx scripts/update-deal.ts "Product B" --no-deal
   ```

3. **Daily cron** (automated, no action needed):
   - Runs daily at 10am UTC via Vercel Cron
   - Searches for unknown deal outcomes automatically
   - Catches anything missed from manual workflow

## Active Systems

### Automated Systems (No Manual Intervention)
- **Vercel Cron - Auto Episode Detection**: Runs at 6am UTC (1am ET), catches missed episodes via TVMaze API + competitor scraping (`/api/cron/auto-episode-check`)
- **Vercel Cron - Daily Enrichment**: Runs at 10am UTC, searches for unknown deal outcomes (`/api/cron/daily-enrich`)
- **Vercel Cron - Narrative Refresh Processing**: Runs every 3 hours, flags products after 1-hour cooldown (`/api/cron/process-narrative-refreshes`)
- **Narrative Refresh Trigger (Immediate)**: Auto-flags products for re-enrichment when status changes
- **Narrative Refresh Trigger (Delayed)**: Schedules refresh 1 hour after deal detail changes (prevents wasted regenerations during live episode updates)
- **Google Analytics**: GA4 + Plausible tracking active

### Available Tools
- **Episode ingestion**: `new-episode.ts`, `update-deal.ts`
- **Batch enrichment**: `batch-enrich.ts`, `enrich-narratives.ts`
- **SEO page creation**: `create-seo-page.ts`, `enrich-seo-pages.ts`
- See `core/quickstart.md` for complete command reference
- See `development/automation.md` for automated systems documentation

## Current Focus Areas

### 1. Google Indexing (Week 1-4)
- Sitemap submitted to Google Search Console
- SEO audit passed - no blockers (robots.txt ✅, structured data ✅, meta tags ✅)
- Action: Request manual indexing for top 10 pages in GSC
- Expected: 1-4 weeks for full indexation

### 2. External Link Building
- Reddit r/sharktank community engagement
- Product Hunt launch (consideration)
- Social media presence (Twitter/X, LinkedIn)

### 3. Operational
- Friday episode workflow active and tested
- Monitor Vercel Cron logs for daily enrichment
- Watch for deal info on new products

## Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
TAVILY_API_KEY=...
OPENAI_API_KEY=...
CRON_SECRET=...
```

## Quick Reference

### Key Architecture Patterns
- Repository pattern for database access
- Service layer for business logic
- Workflow orchestration with cost tracking
- See `architecture/patterns.md` for details

### Database
- 618 products (306 deals, 243 no deal, 69 fell through)
- 47 sharks (8 main + 39 guest, 2 retired: Mark Cuban, Kevin Harrington)
- Schema: 10 migrations deployed (00001-00010)
- All content narrative-enriched

### Frontend Features
- Product/shark pages with narrative content
- Advanced filtering and search
- Category/season/episode pages
- SEO pages: `/still-in-business`, `/out-of-business`, `/success-stories`
- Deal filter pages: `/deals/under-100k`, `/deals/100k-to-500k`, `/deals/over-500k`

## Recent Changes
- **Dec 13**: Delayed narrative refresh system deployed - 1-hour cooldown for deal changes
- **Dec 13**: SEO audit completed - no blockers found, site ready for indexing
- **Dec 13**: 11 missing S9-S12 products added (Poppi, Comfy, Basepaws, etc.)
- **Dec 12**: Vercel Cron automation deployed for daily deal enrichment
- **Dec 12**: Narrative refresh trigger - auto-updates on status changes
- **Dec 12**: All 47 sharks enriched with narrative content
- **Dec 11**: New episode workflow scripts completed

## Historical Context
See `archive/` directory for:
- Phase 1-3 completion details
- Manual seed product imports
- Detailed system implementations
- Migration history
