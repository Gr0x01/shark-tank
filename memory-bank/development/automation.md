---
Last-Updated: 2025-12-13
Maintainer: RB
Status: Active - All Systems Operational (3 Cron Jobs + 3 DB Triggers)
---

# Automation Systems: tankd.io

Complete documentation of all automated processes that run without manual intervention.

## Overview

The application uses two types of automation:
1. **Vercel Cron Jobs** - Scheduled tasks running at fixed intervals
2. **Database Triggers** - Automatic actions when data changes

These systems work together to keep content fresh, reduce manual work, and batch operations for cost efficiency.

---

## 1. VERCEL CRON JOBS

### A. Daily Deal Enrichment
**Purpose**: Automatically find deal information for products with unknown outcomes

**Configuration**:
- **Route**: `/api/cron/daily-enrich`
- **Schedule**: `0 10 * * *` (10:00 AM UTC / 5:00 AM ET daily)
- **Timeout**: 5 minutes max
- **Handler**: `src/app/api/cron/daily-enrich/route.ts`
- **Script**: `scripts/daily-enrich-pending.ts`

**What It Does**:
1. Finds products where `deal_outcome = 'unknown'`
2. Searches the web using Tavily API for deal information
3. Uses OpenAI to extract and structure deal details
4. Updates products with deal terms (amount, equity, sharks)
5. Creates shark relationships in `product_sharks` table
6. Tracks search attempts (max 7 before giving up)

**Limits & Safety**:
- Default: 10 products per run (configurable with `--limit` flag)
- Only searches products untouched for 24+ hours
- Gives up after 7 attempts to avoid infinite loops
- Won't overwrite existing deal data (only updates unknown)

**Environment Variables**:
```bash
CRON_SECRET=<vercel_cron_auth_token>
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
NEXT_PUBLIC_SUPABASE_URL=https://...supabase.co
TAVILY_API_KEY=tvly-...
OPENAI_API_KEY=sk-proj-...
```

**Monitoring**:
- Vercel Dashboard → Functions → Filter: `/api/cron/daily-enrich`
- Returns JSON with success status and output
- Cost tracking via `TokenTracker`

**Manual Run**:
```bash
# Test locally
npx tsx scripts/daily-enrich-pending.ts --limit 5 --dry-run

# Trigger remotely (need CRON_SECRET from Vercel)
curl -X GET "https://tankd.io/api/cron/daily-enrich" \
  -H "Authorization: Bearer <CRON_SECRET>"
```

**Typical Output**:
```
Finding products with unknown deals...
Found 3 products needing deal information
Processing: Product A (Season 17, Episode 8)
✓ Deal found: $200k for 20% from Lori Greiner
Updated 3 products. Cost: $0.03
```

---

### B. Automated Episode Detection
**Purpose**: Automatically detect and import new episodes you might have missed

**Configuration**:
- **Route**: `/api/cron/auto-episode-check`
- **Schedule**: `0 6 * * *` (6:00 AM UTC / 1:00 AM ET daily)
- **Timeout**: 10 minutes max
- **Handler**: `src/app/api/cron/auto-episode-check/route.ts`
- **Script**: `scripts/auto-episode-workflow.ts`

**What It Does**:
1. Checks TVMaze API for Shark Tank episodes aired in last 72 hours
2. Compares to database to find missing episodes
3. Scrapes allsharktankproducts.com for product names from missing episodes
4. Creates products in database with `deal_outcome: 'unknown'`
5. Runs enrichment pipeline (Tavily search + OpenAI synthesis)
6. Generates narrative content for each product

**How It Works**:
```
Episode airs Friday 8pm ET
    ↓
Cron runs Saturday 1am ET (5 hours later)
    ↓
TVMaze API: "S17E7 aired Dec 10, 2025"
    ↓
Database check: "No products for S17E7"
    ↓
Scrape competitor: Found 4 products
    ↓
Create products + run enrichment
    ↓
Pages live Saturday ~1:15am ET
    (10-15 hours before competitor updates!)
```

**Limits & Safety**:
- Lookback: 72 hours (catches weekend delays)
- Only creates products that don't already exist (slug check)
- Skips episodes with no products on competitor site
- Rate limiting: 1.5s between enrichments

**Data Sources**:
- **TVMaze API**: Episode air dates (free, no auth required)
- **allsharktankproducts.com**: Product names (web scraping)
- **Tavily API**: Product backstory and deal research
- **OpenAI**: Data synthesis and extraction

**Environment Variables**:
```bash
CRON_SECRET=<vercel_cron_auth_token>
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
NEXT_PUBLIC_SUPABASE_URL=https://...supabase.co
TAVILY_API_KEY=tvly-...
OPENAI_API_KEY=sk-proj-...
```

**Monitoring**:
- Vercel Dashboard → Functions → Filter: `/api/cron/auto-episode-check`
- Returns JSON with: episodes processed, products created, products enriched
- Check logs for scraping failures (competitor site may be slow)

**Manual Run**:
```bash
# Test locally
npx tsx scripts/auto-episode-workflow.ts --dry-run

# Check for new episodes only (no scraping)
npx tsx scripts/check-new-episodes.ts --lookback 48

# Scrape specific episode
npx tsx scripts/scrape-episode-products.ts --season 17 --episode 8

# Full workflow with custom lookback
npx tsx scripts/auto-episode-workflow.ts --lookback 120

# Trigger remotely (need CRON_SECRET from Vercel)
curl -X GET "https://tankd.io/api/cron/auto-episode-check" \
  -H "Authorization: Bearer <CRON_SECRET>"
```

**Typical Output**:
```
🤖 Automated Episode Workflow
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📡 Step 1: Checking TVMaze for new episodes...
   Found 1 episode(s) aired in last 72 hours:
   - S17E8: "Urine for a Surprise" (2026-01-07)
   ⚠️  Missing: S17E8 - no products in database

📺 Processing S17E8: "Urine for a Surprise"
   Air date: 2026-01-07

🦈 Step 2: Scraping competitor site for products...
   Found 4 product(s) for S17E8:
   - Product A
   - Product B
   - Product C
   - Product D

📝 Step 3: Creating products in database...
   ✓ Created episode: S17E8
   ✓ Created product: Product A (S17E8)
   ✓ Created product: Product B (S17E8)
   ✓ Created product: Product C (S17E8)
   ✓ Created product: Product D (S17E8)

🔍 Step 4: Running enrichment pipeline...
   Enriching: Product A
      ✓ Enriched successfully
   Enriching: Product B
      ✓ Enriched successfully
   [...]

📊 Workflow Complete
   Episodes processed: 1
   Products created: 4
   Products enriched: 4
   Cost: $0.04 (Tavily $0.02 + OpenAI $0.02)
```

**Failure Scenarios**:
1. **Competitor site slow**: Episode aired but not yet on competitor site
   - System silently skips, will retry next day
   - Check: `npx tsx scripts/check-new-episodes.ts` to see pending episodes

2. **Scraping failed**: Competitor changed HTML structure
   - Check Vercel logs for error details
   - Manual fallback: Run `npx tsx scripts/new-episode.ts` with product names

3. **TVMaze API down**: Very rare, API is highly reliable
   - System logs error and exits
   - Will retry automatically next cron run

**Cost Analysis**:
- TVMaze API: Free
- Scraping: Free (Playwright)
- Enrichment per product: ~$0.01 (Tavily $0.005 + OpenAI $0.005)
- **Per episode**: ~$0.04-0.05 (4-5 products average)
- **Monthly**: ~$0.16-0.20 (4 episodes/month)

**When to Use Manual Process**:
- Breaking news product during episode (can't wait for cron)
- Competitor site is down/broken
- Want to verify products before auto-import
- Product names need correction

**Integration with Friday Workflow**:
This automation is a **safety net**, not a replacement for the Friday workflow:
- **Best case**: You watch episode → run `new-episode.ts` → pages live immediately
- **Missed episode**: Cron catches it Saturday → pages live automatically
- **Both**: Automation skips (products already exist)

---

### C. Process Narrative Refreshes
**Purpose**: Flag products for narrative regeneration after 1-hour cooldown

**Configuration**:
- **Route**: `/api/cron/process-narrative-refreshes`
- **Schedule**: `0 */3 * * *` (Every 3 hours)
- **Timeout**: 1 minute max
- **Handler**: `src/app/api/cron/process-narrative-refreshes/route.ts`
- **Script**: `scripts/process-narrative-refreshes.ts`

**What It Does**:
1. Calls database function `process_scheduled_narrative_refreshes()`
2. Finds products where deal changes occurred 1+ hour ago
3. Flags those products for narrative re-enrichment
4. Clears the scheduled timestamp
5. Returns list of flagged products

**Why Every 3 Hours?**:
- Episodes air once per week (Friday 8pm ET)
- Conservative schedule for solo dev MVP
- Batches multiple edits during live watching
- Prevents duplicate narrative regenerations

**Environment Variables**:
```bash
CRON_SECRET=<vercel_cron_auth_token>
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
NEXT_PUBLIC_SUPABASE_URL=https://...supabase.co
```

**Monitoring**:
- Vercel Dashboard → Functions → Filter: `/api/cron/process-narrative-refreshes`
- Returns JSON with flagged product count

**Manual Run**:
```bash
# Test locally
npx tsx scripts/process-narrative-refreshes.ts

# Trigger remotely
curl -X GET "https://tankd.io/api/cron/process-narrative-refreshes" \
  -H "Authorization: Bearer <CRON_SECRET>"
```

**Typical Output**:
```
Flagged 2 products for narrative refresh:
  - Product A (scheduled 2 hours ago)
  - Product B (scheduled 1.5 hours ago)
```

---

## 2. DATABASE TRIGGERS

### A. Updated-At Timestamp Trigger
**Migration**: `00001_initial_schema.sql`

**Purpose**: Automatically track when records are modified

**Tables**: `products`, `sharks`, `episodes`

**Trigger**: BEFORE UPDATE

**What It Does**:
- Sets `updated_at = NOW()` on every row update
- Passive tracking, no side effects

---

### B. Narrative Refresh on Status Change (Immediate)
**Migration**: `00007_narrative_refresh_on_status_change.sql`

**Purpose**: Immediately flag products when business status changes

**Table**: `products`

**Trigger**: BEFORE UPDATE

**Fires When**:
- `status` column changes (e.g., active → out_of_business)
- AND `narrative_version > 0` (skip if already flagged)

**What It Does**:
- Sets `narrative_version = 0` (immediate flag)
- Clears `narrative_refresh_scheduled_at` (cancel any scheduled refresh)
- Logs change to PostgreSQL NOTICE

**Why Immediate?**:
Status changes are rare and significant. When a business closes, narrative content ("still in business") becomes immediately incorrect. No batching needed.

**Example**:
```sql
UPDATE products SET status = 'out_of_business' WHERE id = '...';
-- Trigger fires: narrative_version → 0
-- Next enrichment run will regenerate narrative
```

---

### C. Schedule Narrative Refresh on Deal Changes (Delayed)
**Migration**: `00010_delayed_narrative_refresh.sql`

**Purpose**: Batch multiple deal edits into single narrative refresh

**Table**: `products`

**Trigger**: BEFORE UPDATE

**Fires When ANY of These Fields Change**:
- `deal_outcome` (deal/no_deal/fell_through)
- `deal_amount`, `deal_equity`
- `royalty_deal`, `royalty_terms`
- `deal_notes`
- `asking_amount`, `asking_equity`

**What It Does**:
- Sets `narrative_refresh_scheduled_at = NOW()`
- Each edit resets the timer (latest change determines refresh time)
- Only schedules if `narrative_version > 0` (skip if already immediately flagged)

**Why Delayed?**:
During live episode watching, deal details are updated incrementally:
1. "Lori offers $200k for 20%"
2. "Entrepreneur counters: $200k for 15%"
3. "Final deal: $250k for 18%"

Without batching, this would trigger 3 narrative regenerations ($0.003). With 1-hour cooldown, they batch into 1 regeneration ($0.001).

**Cooldown Period**: 1 hour
- After last edit, wait 1 hour
- Cron checks every 3 hours
- Product flagged on first cron run after cooldown expires

---

### D. Process Scheduled Narrative Refreshes (Database Function)
**Migration**: `00010_delayed_narrative_refresh.sql`

**Function**: `process_scheduled_narrative_refreshes()`

**Type**: RPC function (called by cron)

**Returns**: TABLE(product_id UUID, product_name TEXT, scheduled_at TIMESTAMPTZ)

**Logic**:
```sql
SELECT id, name, narrative_refresh_scheduled_at
FROM products
WHERE narrative_refresh_scheduled_at < NOW() - INTERVAL '1 hour'
  AND narrative_version > 0
FOR UPDATE SKIP LOCKED;
```

**What It Does**:
1. Finds products where scheduled time is 1+ hour old
2. Uses `FOR UPDATE SKIP LOCKED` to prevent race conditions
3. Sets `narrative_version = 0` (flags for refresh)
4. Clears `narrative_refresh_scheduled_at`
5. Returns list for logging

**Race Condition Protection**:
- `SKIP LOCKED` prevents blocking if user is editing same product
- If locked, cron skips it and tries next run (3 hours later)

---

### E. Flag Product for Narrative Refresh (Helper Function)
**Migration**: `00007_narrative_refresh_on_status_change.sql`

**Function**: `flag_product_for_narrative_refresh(product_id UUID)`

**Type**: RPC function (manual trigger)

**Purpose**: Manually flag specific product for narrative refresh

**Usage**:
```sql
SELECT flag_product_for_narrative_refresh('product-uuid-here');
```

**What It Does**:
- Sets `narrative_version = 0` only if > 0
- Returns TRUE if updated

**When to Use**:
- Testing narrative regeneration
- Fixing stale narratives without changing data
- After manual SQL edits that bypass triggers

---

## 3. EXECUTION FLOW & DEPENDENCIES

### Typical Friday Episode Workflow
```
User Actions                 Automated Systems
─────────────────           ────────────────────────────

8:00 PM - Create products
└─> new-episode.ts
    └─> Enrichment runs
        └─> Backstory generated

8:30 PM - Update deal #1
└─> update-deal.ts
    └─> Trigger fires
        └─> scheduled_at = NOW()

8:35 PM - Update deal #2
└─> update-deal.ts
    └─> Trigger fires
        └─> scheduled_at = NOW() (resets timer)

9:45 PM - Update deal #3
└─> update-deal.ts
    └─> Trigger fires
        └─> scheduled_at = NOW() (resets timer)

                            ┌────────────────────────────┐
                            │ Cooldown Period (1 hour)   │
                            └────────────────────────────┘

                            12:00 AM - Cron runs
                            └─> Checks scheduled_at
                                └─> 10:45 PM < 11:00 PM
                                    └─> Not ready yet

                            3:00 AM - Cron runs
                            └─> Checks scheduled_at
                                └─> 10:45 PM < 2:00 AM
                                    └─> Ready! Flag product
                                        └─> narrative_version = 0

                            10:00 AM - Daily cron runs
                            └─> Finds flagged products
                                └─> Regenerates narratives
                                    └─> Fresh content live!
```

### Immediate Refresh (Status Change)
```
User Action                 Automated Systems
───────────                ────────────────────────────

Update status to closed
└─> edit product form
    └─> Status trigger fires
        └─> narrative_version = 0 (immediate)
        └─> scheduled_at = NULL (cancel any scheduled)

                            10:00 AM - Daily cron runs
                            └─> Finds flagged product
                                └─> Regenerates narrative
                                    └─> Updated "out of business" section
```

---

## 4. MONITORING & DEBUGGING

### Check Cron Execution

**Vercel Dashboard**:
1. Go to Vercel Dashboard → Project → Functions
2. Filter by route: `/api/cron/daily-enrich` or `/api/cron/process-narrative-refreshes`
3. Check for errors (401 = bad secret, 500 = execution failed, timeout = took too long)

**Database Queries**:
```sql
-- Check products pending narrative refresh
SELECT id, name, narrative_version, narrative_refresh_scheduled_at
FROM products
WHERE narrative_refresh_scheduled_at IS NOT NULL
ORDER BY narrative_refresh_scheduled_at ASC;

-- Check products with unknown deals
SELECT id, name, deal_outcome, deal_search_attempts, last_enriched_at
FROM products
WHERE deal_outcome = 'unknown'
ORDER BY last_enriched_at ASC NULLS FIRST
LIMIT 10;

-- Check recently flagged products
SELECT id, name, narrative_version, updated_at
FROM products
WHERE narrative_version = 0
ORDER BY updated_at DESC
LIMIT 10;
```

### Test Locally

**Daily Enrichment**:
```bash
npx tsx scripts/daily-enrich-pending.ts --limit 5 --dry-run
```

**Narrative Refresh Processing**:
```bash
npx tsx scripts/process-narrative-refreshes.ts
```

**Cron Endpoint (Requires CRON_SECRET)**:
```bash
# Get CRON_SECRET from Vercel Dashboard → Settings → Environment Variables
curl -X GET "https://tankd.io/api/cron/daily-enrich" \
  -H "Authorization: Bearer <CRON_SECRET>"
```

### Common Errors & Solutions

**401 Unauthorized**:
- Problem: `CRON_SECRET` missing or incorrect
- Fix: Check Vercel Dashboard → Settings → Environment Variables

**500 Internal Server Error**:
- Problem: Script execution failed
- Fix: Check Vercel function logs for stderr output
- Common causes: missing env var, database connection issue, API rate limit

**Timeout (Function exceeded max duration)**:
- Problem: Script took > 5 min (daily) or > 1 min (narrative)
- Fix: Reduce `--limit` flag or optimize script
- Check: TokenTracker output for API call count

**No Products Updated**:
- Problem: No products match criteria
- Fix: Check database queries above to verify products exist
- Check: `deal_search_attempts < 7`, `last_enriched_at` older than 24h

---

## 5. COST ANALYSIS

### API Call Costs (Monthly Estimates)

**Daily Deal Enrichment**:
- Runs: 30 days/month
- Products per run: ~10 (average)
- Tavily searches: 10 products × 1 search × $0.01 = $0.10/day
- OpenAI synthesis: 10 products × $0.001 = $0.01/day
- **Monthly**: ~$3.30 (Tavily) + ~$0.30 (OpenAI) = **$3.60**

**Narrative Refresh Processing**:
- Runs: 8 times/day × 30 days = 240 runs/month
- Products flagged: ~5/week (varies)
- OpenAI narrative generation: 5 products × $0.001 = $0.005/week
- **Monthly**: ~$0.02 (negligible)

**Total Automation Cost**: ~$3.62/month

**Vercel Compute**:
- Included in Vercel Pro plan ($20/month)
- Functions run well under usage limits

---

## 6. CONFIGURATION FILES

### vercel.json (Cron Schedule)
```json
{
  "crons": [
    {
      "path": "/api/cron/daily-enrich",
      "schedule": "0 10 * * *"
    },
    {
      "path": "/api/cron/process-narrative-refreshes",
      "schedule": "0 */3 * * *"
    }
  ]
}
```

### Environment Variables Checklist
```bash
# Required for both cron jobs
CRON_SECRET=<generate_random_token>
NEXT_PUBLIC_SUPABASE_URL=https://...supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# Required for daily enrichment only
TAVILY_API_KEY=tvly-...
OPENAI_API_KEY=sk-proj-...
```

---

## 7. MAINTENANCE & OPERATIONS

### Weekly Checks
- [ ] Verify cron jobs ran successfully (Vercel dashboard)
- [ ] Check for products stuck with `deal_outcome = 'unknown'`
- [ ] Monitor API costs (Tavily + OpenAI usage)

### Monthly Reviews
- [ ] Analyze flagged products vs. regenerated narratives
- [ ] Review `deal_search_attempts` distribution (are products giving up too soon?)
- [ ] Check for trigger failures (PostgreSQL logs)

### When Episodes Air (Fridays)
- No action needed! Automation handles:
  1. User creates products → Enrichment runs
  2. User updates deals → Timer schedules refresh
  3. Cron processes → Narratives regenerate
  4. Daily cron → Catches any missed deals

### Troubleshooting Checklist

**Product Not Updating**:
1. Check `deal_search_attempts` (stopped after 7?)
2. Check `last_enriched_at` (recently searched?)
3. Verify cron ran today (Vercel logs)
4. Test search manually: `npx tsx scripts/daily-enrich-pending.ts --limit 1 --force`

**Narrative Not Refreshing**:
1. Check `narrative_version` (is it 0?)
2. Check `narrative_refresh_scheduled_at` (is it set and old enough?)
3. Verify cron ran in last 3 hours (Vercel logs)
4. Test manually: `npx tsx scripts/process-narrative-refreshes.ts`

**High API Costs**:
1. Check `TokenTracker` output in cron logs
2. Verify `--limit` flags are appropriate
3. Review products with high `deal_search_attempts` (failing repeatedly?)

---

## 8. FUTURE ENHANCEMENTS

Potential improvements to automation:

### Content Freshness
- [ ] Auto-verify product status (active/closed) every 90 days
- [ ] Check for dead "where to buy" links quarterly
- [ ] Refresh shark narratives when major career events occur

### Intelligence
- [ ] ML model to predict deal outcome based on pitch data
- [ ] Sentiment analysis on episode discussions (Reddit, Twitter)
- [ ] Automatic categorization of new products

### Monitoring
- [ ] Slack/email alerts on cron failures
- [ ] Cost threshold alerts (>$5/day API usage)
- [ ] Dashboard for automation health metrics

### Performance
- [ ] Parallel narrative generation (currently sequential)
- [ ] Incremental narrative updates (only changed sections)
- [ ] Smart caching for web search results

---

## 9. SUMMARY TABLE

| System | Type | Schedule | Duration | Modifies | Cost/Month |
|--------|------|----------|----------|----------|------------|
| Automated Episode Detection | Cron | 6am UTC | 3-10 min | products, episodes, enrichment data | $0.20 |
| Daily Deal Enrichment | Cron | 10am UTC | 3-5 min | deal_outcome, deal_amount, product_sharks | $3.60 |
| Narrative Refresh Processing | Cron | Every 3h | 10 sec | narrative_version | $0.02 |
| Status Change Trigger | DB Trigger | On UPDATE | Instant | narrative_version | $0 |
| Deal Change Trigger | DB Trigger | On UPDATE | Instant | narrative_refresh_scheduled_at | $0 |
| Updated-At Trigger | DB Trigger | On UPDATE | Instant | updated_at | $0 |

**Total Monthly Cost**: ~$3.82

**Manual Effort Saved**: ~3 hours/week (episode monitoring, searching for deals, flagging narratives)

---

## Related Documentation
- [Quickstart Guide](../core/quickstart.md) - Quick reference for all commands
- [Content Enrichment Guide](./content-enrichment.md) - Manual enrichment workflows
- [Tech Stack](../architecture/techStack.md) - Infrastructure details
- [Architecture Patterns](../architecture/patterns.md) - Design patterns used
