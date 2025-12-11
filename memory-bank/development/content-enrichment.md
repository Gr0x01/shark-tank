---
Last-Updated: 2025-12-12
Maintainer: RB
Status: Active
---

# Content Enrichment Operations Guide

## Overview

This document describes the automated content enrichment system that powers product and shark narrative generation using Tavily search + OpenAI synthesis.

## Architecture

### Data Flow
```
Product Status Change
    ↓ (PostgreSQL Trigger)
narrative_version = 0 (flagged)
    ↓ (Manual/Cron)
Enrichment Script
    ↓ (Tavily API)
Web Search Results
    ↓ (OpenAI gpt-4.1-mini)
Generated Narrative Content
    ↓
narrative_version = 1 (saved)
```

### Key Components

1. **Database Trigger**: `trigger_narrative_refresh_on_status_change`
   - Watches `products.status` column for changes
   - Automatically flags products for re-enrichment
   - Located in: `supabase/migrations/00007_narrative_refresh_on_status_change.sql`

2. **Search Layer**: Tavily Client
   - Web search with 30-day caching
   - Located in: `scripts/ingestion/enrichment/shared/tavily-client.ts`
   - Config: `TAVILY_API_KEY` in `.env.local`

3. **Generation Layer**: OpenAI Synthesis
   - Model: `gpt-4.1-mini` with Flex tier (50% cost savings)
   - Located in: `scripts/ingestion/enrichment/shared/synthesis-client.ts`
   - Config: `OPENAI_API_KEY` in `.env.local`

4. **Enrichment Scripts**:
   - `scripts/enrich-narratives.ts` - Product narratives (6 sections)
   - `scripts/enrich-shark-narratives.ts` - Shark narratives (5 sections)

## Product Narrative Enrichment

### Narrative Sections

Each product gets 6 SEO-optimized narrative sections:

1. **origin_story** (150-250 words)
   - Founder background and the "aha moment"
   - Naturally includes phrase: "[Product Name] Shark Tank"

2. **pitch_journey** (150-200 words)
   - The pitch episode details
   - Season, episode, ask amount, shark reactions

3. **deal_dynamics** (100-150 words)
   - Deal negotiation or why no deal happened
   - Competing offers, final terms

4. **after_tank** (150-200 words)
   - Post-episode business developments
   - Sales growth, product expansion, challenges
   - Includes phrases: "after Shark Tank", "since appearing on Shark Tank"

5. **current_status** (100-150 words)
   - Where the company is today
   - Revenue, partnerships, business health
   - Includes phrase: "still in business" (if active) or explains closure

6. **where_to_buy** (50-100 words)
   - Purchase options: website, Amazon, retail stores
   - Price range

### Running Product Enrichment

```bash
# Enrich products flagged for refresh (narrative_version = 0)
npx tsx scripts/enrich-narratives.ts --limit 10

# Enrich specific product by name
npx tsx scripts/enrich-narratives.ts --product "Scrub Daddy"

# Enrich multiple specific products
npx tsx scripts/enrich-narratives.ts --product "Scrub Daddy" --product "Bombas"

# Dry run (preview without saving)
npx tsx scripts/enrich-narratives.ts --limit 5 --dry-run

# Output JSON for inspection
npx tsx scripts/enrich-narratives.ts --product "Scrub Daddy" --json
```

### Cost & Performance

- **Cost**: ~$0.001 per product (~$0.60 for all 589 products)
- **Time**: 1-2 minutes per product (Flex tier processing)
- **Rate Limit**: 1.5s delay between requests to avoid throttling
- **Caching**: Tavily results cached 30 days, reduces cost on re-runs

## Shark Narrative Enrichment

### Narrative Sections

Each shark gets 5 narrative sections:

1. **biography** - Background, career before Shark Tank
2. **investment_philosophy** - Investment style and preferences
3. **shark_tank_journey** - Years on show, notable moments
4. **notable_deals** - Biggest successes and investments
5. **beyond_the_tank** - Other ventures and current activities

### Running Shark Enrichment

```bash
# Enrich specific shark
npx tsx scripts/enrich-shark-narratives.ts --shark "Mark Cuban"

# Enrich all sharks
npx tsx scripts/enrich-shark-narratives.ts --all

# Enrich sharks flagged for refresh
npx tsx scripts/enrich-shark-narratives.ts --limit 5
```

## Automatic Refresh System

### When Narratives Get Flagged

The database trigger automatically sets `narrative_version = 0` when:

1. **Status Changes**: Product status changes (e.g., active → out_of_business)
   - Trigger: `trigger_narrative_refresh_on_status_change`
   - Watches: `products.status` column

2. **Manual Flagging**: Explicit flag via SQL function
   ```sql
   SELECT flag_product_for_narrative_refresh('product-uuid-here');
   ```

### Checking What Needs Enrichment

```sql
-- Find products flagged for narrative refresh
SELECT id, name, status, narrative_version, narrative_generated_at
FROM products
WHERE narrative_version = 0
ORDER BY updated_at DESC;

-- Find products never enriched
SELECT id, name, status
FROM products
WHERE narrative_version IS NULL OR narrative_version = 0
ORDER BY season DESC, episode_number DESC
LIMIT 20;

-- Find products with stale narratives (>90 days old)
SELECT id, name, status, narrative_generated_at
FROM products
WHERE narrative_generated_at < NOW() - INTERVAL '90 days'
  AND narrative_version > 0
ORDER BY narrative_generated_at ASC
LIMIT 20;
```

## Operational Workflows

### Weekly Maintenance

```bash
# 1. Check for products flagged for refresh
# (Happens automatically when status changes)

# 2. Run enrichment on flagged products
npx tsx scripts/enrich-narratives.ts --limit 20

# 3. Monitor costs and success rate
# Check console output for token usage and failures
```

### When Product Status Changes

```bash
# 1. Update status (trigger automatically flags for refresh)
# Via script, admin panel, or direct SQL

# 2. Regenerate narrative (can batch or do immediately)
npx tsx scripts/enrich-narratives.ts --product "Product Name"

# 3. Verify new narrative reflects status change
# Check product page or query database
```

### Bulk Re-enrichment

If you need to regenerate all narratives (e.g., improved prompts):

```bash
# 1. Flag all products for refresh
UPDATE products SET narrative_version = 0 WHERE narrative_version > 0;

# 2. Run batch enrichment with high limit
npx tsx scripts/enrich-narratives.ts --limit 50

# 3. Monitor progress and repeat until done
# Check count: SELECT COUNT(*) FROM products WHERE narrative_version = 0;
```

## Data Sources

### Tavily Search Coverage

Tavily consistently returns these high-quality sources (in order):

1. **sharktankblog.com** (#1 result) - Product updates, deal details
2. **sharksnetworth.com** - Revenue estimates, valuations
3. **Wikipedia** - General product/founder info
4. **Official websites** - Company status, current info
5. **Reddit r/sharktank** - Community updates, closure reports

### Search Queries

**Product Status:**
```
"[Product Name] Shark Tank still in business 2024 2025 where to buy"
```

**Product Details:**
```
"[Product Name] Shark Tank deal details founders sharks invested"
```

**After Tank:**
```
"[Product Name] after Shark Tank update sales growth"
```

## LLM Configuration

### Model Selection

We use **gpt-4.1-mini** with Flex tier:
- **Accuracy**: 100% on deal extraction (tested on 279 products)
- **Cost**: ~$0.001 per product (~50% cheaper than standard tier)
- **Speed**: 1-2 minutes per product (Flex queue priority)

### Why Not Other Models?

- **gpt-4o-mini**: Had hallucination issues (confused "made offer" with "closed deal")
- **gpt-5-mini/nano**: Not tested yet, may be worth evaluating for cost savings
- **Claude models**: Not tested, would need Anthropic API integration

### Prompt Engineering

Prompts emphasize:
- Factual accuracy (only use search results)
- SEO optimization (natural keyword placement)
- Specific numbers and dates
- No bullet points (flowing narrative paragraphs)
- Null for missing information (don't fabricate)

See `scripts/enrich-narratives.ts` for full prompt.

## Monitoring & Troubleshooting

### Success Metrics

Monitor enrichment output for:
- **Success rate**: Should be near 100%
- **Generated sections**: Should be 6/6 for products
- **Token cost**: Should be ~$0.001 per product
- **Cache hit rate**: Should increase over time (reduces cost)

### Common Issues

**Issue: "No products to process"**
- **Cause**: No products flagged (narrative_version = 0)
- **Fix**: Check if products exist with that name, or flag manually

**Issue: Generation failed**
- **Cause**: API timeout, rate limit, or invalid JSON response
- **Fix**: Check API keys, wait and retry, inspect error message

**Issue: Narrative says "still in business" but product is closed**
- **Cause**: Stale narrative not regenerated after status change
- **Fix**: Verify trigger is working, manually flag and re-enrich

**Issue: High costs**
- **Cause**: Cache misses, running on already-enriched products
- **Fix**: Check narrative_version before running, leverage cache

### Debugging

```bash
# Dry run to see what would be generated without saving
npx tsx scripts/enrich-narratives.ts --product "Product Name" --dry-run

# Check Tavily cache for a product
SELECT * FROM search_cache
WHERE entity_name ILIKE '%Product Name%'
ORDER BY fetched_at DESC;

# Check enrichment history
SELECT name, enrichment_status, last_enriched_at, narrative_version
FROM products
WHERE name ILIKE '%Product Name%'
ORDER BY updated_at DESC;
```

## Future Enhancements

Potential improvements to consider:

1. **Automated Cron Jobs**
   - Daily: Check for flagged products and enrich (limit 20)
   - Weekly: Re-enrich products with very stale narratives (>90 days)

2. **Quality Scoring**
   - Add metadata about narrative quality (word count, section completeness)
   - Flag poor-quality narratives for manual review

3. **A/B Testing**
   - Test different prompt variations
   - Compare engagement metrics (time on page, bounce rate)

4. **Real-time Enrichment**
   - For high-priority products, enrich immediately on status change
   - Use webhook or background job queue

5. **Source Attribution**
   - Store which URLs were used in narrative generation
   - Helps with fact-checking and transparency
