---
Last-Updated: 2025-12-13
Maintainer: RB
Status: Phase 3 Complete - Production Ready
---

# Quickstart: tankd.io

## Current Status
- **Phase**: 3 - COMPLETE ✅
- **Version**: 1.0.0
- **Environment**: Production Ready
- **Focus**: Launch preparation, monitoring, optimization

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
# When product status changes, narrative is auto-flagged for refresh (database trigger)
# Run this to regenerate narratives for flagged products:
npx tsx scripts/enrich-narratives.ts --limit 10

# Check which products need narrative refresh:
# SELECT id, name, status FROM products WHERE narrative_version = 0;

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
5. Run `update-deal.ts` for each product → deal details added
6. **Automated daily cron catches anything missed** (runs at 10am UTC via Vercel)

**Note:** The daily enrichment script (`daily-enrich-pending.ts`) runs automatically via Vercel Cron - no manual intervention needed. It searches for unknown deal outcomes and updates products with high-confidence results.

## Quick Links
- [Project Brief](./projectbrief.md)
- [Tech Stack](../architecture/techStack.md)
- [Active Context](../development/activeContext.md)
- [Progress Log](../development/progress.md)
- [Content Enrichment Guide](../development/content-enrichment.md)
- [Architecture Patterns](../architecture/patterns.md)

## Database Status
- **Products**: 607 total (297 deals, 241 no deal, 69 fell through)
  - ALL 607 enriched with narrative content
  - Includes 18 manually curated "greatest hits" (Bombas, Ring, Scrub Daddy, etc.)
- **Sharks**: 47 (8 main + 39 guest)
  - All have photos in Supabase Storage
  - ALL 47 enriched with narrative content
  - 2 marked as retired (Mark Cuban, Kevin Harrington)
- **Schema**: Deployed with 8 migrations (00001-00008)

## Environment Requirements
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
TAVILY_API_KEY=...
OPENAI_API_KEY=...
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
