---
Last-Updated: 2025-12-11
Maintainer: RB
Status: Phase 3 - Frontend + New Episode Workflow
---

# Quickstart: Shark Tank Products

## Current Status
- **Phase**: 3 - Frontend Development
- **Version**: 0.1.0
- **Environment**: Local Development
- **Focus**: Frontend pages + weekly episode ingestion

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
npx tsx scripts/enrich-narratives.ts --limit 10
```

**IMPORTANT**: Always use port 3004 for this project to avoid conflicts.

## Friday Episode Workflow
1. Episode airs Friday 8pm ET
2. Find product names (Google, Reddit r/sharktank, competitor)
3. Run `new-episode.ts` with product names → pages go live with backstory
4. Watch episode, note deals
5. Run `update-deal.ts` for each product → deal details added
6. Daily cron catches anything missed

## Quick Links
- [Project Brief](./projectbrief.md)
- [Tech Stack](../architecture/techStack.md)
- [Active Context](../development/activeContext.md)
- [Progress Log](../development/progress.md)

## Database Status
- **Products**: 589 total (279 deals, 238 no deal, 67 fell through)
- **Sharks**: 47 (8 main + 39 guest)
- **Enrichment**: All products enriched with deal details
- **Schema**: Deployed with 5 migrations

## Environment Requirements
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
TAVILY_API_KEY=...
OPENAI_API_KEY=...
```

## Project Overview
Shark Tank Products Directory - comprehensive database of every product pitched on Shark Tank with:
- Current business status (active/closed)
- Deal details (shark, amount, equity)
- Where to buy (Amazon, retail, direct)
- Freshness tracking (last verified dates)
- Weekly episode ingestion workflow
