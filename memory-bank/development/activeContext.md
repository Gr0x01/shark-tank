---
Last-Updated: 2025-12-14
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

### Performance & Caching Architecture
- **ISR (Incremental Static Regeneration)**: Time-based page caching with automatic refresh
  - Home page: 6 hours (new episodes weekly)
  - Product pages: 12 hours (updates monthly)
  - Shark pages: 24 hours (rarely change)
  - Season/Episode/Category pages: 24 hours (historical data)
  - SEO pages: 12 hours (content updates occasionally)
- **React Cache**: Query deduplication within single render (60-80% fewer duplicate DB calls)
- **Implementation**: `/src/lib/queries/cached.ts` wraps all database queries with React's `cache()`
- **Expected Performance**: Sub-100ms page loads for cached pages, automatic background refresh
- **Key Learning**: Next.js 16 App Router ISR works differently than Pages Router - pages with async data fetching show as "dynamic" but are still cached per revalidate time

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
- **Dec 14**: ISR + React Cache optimization deployed for 60-80% database query reduction
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

---

## Operational Procedures

### Google Search Console Checklist

**Weekly Monitoring** (10 minutes):
- [ ] GSC → Coverage report: Check indexing progress
- [ ] Look for "Discovered - not indexed" warnings
- [ ] Monitor "Page indexing" status (should increase weekly)
- [ ] Check for new validation errors (none expected with Article schema)

**Manual Indexing Requests**:
1. GSC → URL Inspection → Enter URL
2. Click "Request Indexing" button
3. **Priority pages** (do first):
   - Home: `https://tankd.io`
   - Products listing: `https://tankd.io/products`
   - Sharks listing: `https://tankd.io/sharks`
   - Top 5 product pages (Bombas, Scrub Daddy, Ring, Squatty Potty, Tipsy Elves)
   - Still in business: `https://tankd.io/still-in-business`

**Expected Timeline**:
- Manual indexing: 2-7 days
- Full site indexation: 1-4 weeks (618 products is a lot)
- If "Discovered - not indexed" persists after 3 weeks, request manual indexing for those pages

---

### External Link Building Strategy

**Reddit Engagement** (1-2x per week):
- **Subreddit**: r/sharktank
- **Strategy**: Helpful comments mentioning tankd.io when relevant
- **Example**: "I track all Shark Tank products at tankd.io - [Product] is still active and selling on Amazon!"
- **Avoid**: Spammy self-promotion, posting every episode

**Product Hunt Launch**:
- **Timing**: After Google indexes 50+ pages (2-3 weeks from Dec 13)
- **Prep**: Create compelling tagline, screenshots, demo GIF
- **Goal**: 50-100 upvotes, external backlinks
- **Tagline idea**: "Every Shark Tank product, deal & business status in one place"

**Social Media**:
- **Twitter/X**: Share weekly episode updates, success stories (2-3x per week)
- **LinkedIn**: Share data insights (e.g., "40% of Shark Tank deals fail within 5 years")
- **Frequency**: 2-3x per week, not daily

---

### Weekly Monitoring Checklist

**Daily** (2 minutes):
- [ ] Vercel Dashboard → Functions → Check cron execution:
  - `/api/cron/daily-enrich` (10am UTC)
  - `/api/cron/process-narrative-refreshes` (every 3 hours)
  - `/api/cron/auto-episode-check` (6am UTC Saturdays)
- [ ] Supabase Dashboard → Performance: Query time <100ms avg
- [ ] Google Analytics → Real-time: Verify tracking active

**Weekly** (10 minutes):
- [ ] Google Search Console: Coverage report, indexing progress
- [ ] Vercel Analytics: Error rate (should be <1%)
- [ ] Cost monitoring: OpenAI + Tavily API usage (should be ~$3-4/month)
- [ ] Reddit r/sharktank: Engage on 1-2 posts about recent episode

**Monthly** (30 minutes):
- [ ] Google Search Console: Search performance (impressions, clicks, CTR)
- [ ] External links audit: Google "site:tankd.io" to see who's linking
- [ ] Content freshness: Check products with stale `last_verified` dates
- [ ] Cost analysis: Total API spend vs budget

---

### Cost Monitoring & Alerts

**Current Monthly Costs** (~$3.82/month API usage):
- **Vercel Pro**: $20/month (compute included, not per-API cost)
- **Supabase Free tier**: $0 (within limits: <500MB database, <2GB bandwidth)
- **OpenAI API**: ~$0.20/month (Flex tier, 50% cost savings)
- **Tavily API**: ~$3.60/month (search queries for enrichment)
- **Google Analytics**: $0 (free tier)
- **Plausible**: $0 (free tier)

**Alert Thresholds** (set up manual monitoring):
- OpenAI spend >$10/month (unusual enrichment volume, check for runaway cron)
- Tavily spend >$20/month (hitting rate limits or over-enriching)
- Vercel bandwidth >100GB/month (viral traffic, good problem to have!)

**When to Scale**:
- Traffic >10k daily visitors → Upgrade Supabase (connection pooling, better performance)
- Products >2000 → Consider batch enrichment optimizations
- API costs >$50/month → Review enrichment triggers, reduce cron frequency

---

### Troubleshooting Quick Reference

**Cron job failed**:
- **Symptom**: No Vercel Cron execution in logs
- **Check**: Vercel Dashboard → Functions → Filter by `/api/cron/`
- **Fix**: Re-run manually:
  ```bash
  npx tsx scripts/daily-enrich-pending.ts
  npx tsx scripts/process-narrative-refreshes.ts
  ```

**Product narrative not refreshing**:
- **Symptom**: Deal details updated but narrative still stale
- **Check**: Database query:
  ```sql
  SELECT narrative_refresh_scheduled_at, narrative_version
  FROM products WHERE slug = 'product-slug';
  ```
- **Fix**: Manually flag for refresh:
  ```sql
  SELECT flag_product_for_narrative_refresh('product-uuid');
  ```

**Search Console: "Discovered - not indexed"**:
- **Symptom**: Pages found but not indexed by Google
- **Likely cause**: Too many pages submitted at once (618 products)
- **Fix**: Request manual indexing for top 10 pages, wait 2-3 weeks for auto-indexing

**Site down or slow**:
- **Check**: Vercel Dashboard → Deployments (recent deploy?)
- **Check**: Supabase Dashboard → Performance (query time spike?)
- **Rollback**: Vercel Dashboard → Deployments → Previous version → Promote to Production

**Database migration failed**:
- **Never run migrations in production without testing locally first**
- **Rollback**: Migrations are one-way, restore from Supabase backup if needed
- **Prevention**: Always run `npx supabase db push` locally first

---

### Domain Configuration (DO NOT CHANGE)

**Canonical domain**: `tankd.io` (non-www)

**Vercel Dashboard → Settings → Domains:**
| Domain | Config | Notes |
|--------|--------|-------|
| `tankd.io` | **Production** (primary) | All canonical URLs use this |
| `www.tankd.io` | 308 redirect → `tankd.io` | Permanent redirect for SEO |
| `shark-tank-flame.vercel.app` | Production | Vercel default, leave as-is |

**Why non-www?**
- All code uses `https://tankd.io` (sitemaps, canonicals, OG tags)
- Shorter URLs, modern convention
- Already indexed by Google as non-www

**DO NOT flip this configuration.** If www→non-www causes issues:
1. Check if the issue is actually the redirect (unlikely)
2. The code would need updates to all canonical URLs if switching to www
3. Google would need to re-index everything (takes weeks)

**History**: Dec 2025 - Configuration was accidentally inverted (tankd.io redirecting TO www). Fixed Dec 22, 2025.
