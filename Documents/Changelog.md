# Changelog: tankd.io

Running log of shipped milestones. Newest first. Detailed Phase 1–3 implementation history is archived in `.koda/memory/archive/phase-1-3-history.md`.

## Milestones

| # | Name | Date | Notes |
|---|------|------|-------|
| 31 | SEO Fix: Deal Info + Shark Links Now Crawlable | Aug 2, 2026 | Spoiler gate hides the real outcome with CSS instead of removing it from the DOM — 666 product pages now carry their deal figures and shark links in the HTML. Also fixed `getProductSlugs()` silently capping `generateStaticParams` at 100 |
| 30 | Affiliate Click Tracking + Analytics Dashboard | Jul 30, 2026 | `affiliate_link_clicked` event via shared `AffiliateLink.tsx` on all 4 Amazon CTAs; "Traffic & Affiliate Revenue" dashboard (7 tiles); privacy policy updated for PostHog |
| 29 | PostHog Analytics + Session Replay | Jul 30, 2026 | `src/instrumentation-client.ts`; PostHog project "Tankd" (534816). Replay sampled 30%, Web Vitals + error tracking + heatmaps on. Plausible removed, GA4 kept |
| 28 | S17 Episode Backfill (E3, E14–E17) | Apr 25, 2026 | 20 products via new `scripts/backfill-episodes.ts` (reusable for future cron gaps) |
| 27 | IndexNow Auto-Submit for New Products | Mar 16, 2026 | Shared utility in `src/lib/services/indexnow.ts`, wired into manual + cron pipelines |
| 26 | Auto Photo Scraping in Episode Pipeline | Mar 16, 2026 | og:image/Tavily scraping in pipeline; backfilled 52 missing photos |
| 25 | Dependency Upgrade | Mar 16, 2026 | Next.js 16.1.6, React 19.2.4, Zod 4, Supabase 2.99, Tailwind 4.2, Playwright 1.58 (ESLint 10 blocked upstream) |
| 24 | ISR + React Cache Optimization | Dec 14, 2025 | 60–80% fewer duplicate DB queries, sub-100ms cached loads |
| 23 | Delayed Narrative Refresh System | Dec 13, 2025 | 1-hour cooldown batches deal edits into one regeneration |
| 22 | Manual Seed Products Import | Dec 13, 2025 | 18 "greatest hits" products (Poppi, The Comfy, Basepaws, etc.) |
| 21 | Vercel Cron Automation | Dec 12, 2025 | Episode detection, daily enrichment, narrative refresh |
| 20 | Retired Shark Status System | Dec 12, 2025 | Mark Cuban, Kevin Harrington marked retired |
| 19 | All Sharks Narrative Enrichment | Dec 12, 2025 | 47 sharks, cost $0.0555 |
| 18 | Auto Narrative Refresh System | Dec 12, 2025 | DB trigger flags narratives on status change |
| 17 | SEO & Structured Data | Dec 12, 2025 | Full metadata + schema.org across the site |
| 16 | Shark Narrative Enrichment Script | Dec 12, 2025 | |
| 15 | Search & Filters | Dec 12, 2025 | |
| 14 | Shark Portfolio Pages | Dec 12, 2025 | |
| 13 | Shark Listing Page | Dec 12, 2025 | With leaderboard |
| 12 | Product Listing Page | Dec 12, 2025 | Advanced filters |
| 11 | Home Page | Dec 12, 2025 | Latest episode + season sections |
| 10 | New Episode Workflow | Dec 11, 2025 | 3 scripts: new-episode, update-deal, daily-enrich |
| 9 | Product Page Redesign | Dec 11, 2025 | |
| 8 | Product Narrative Enrichment | Dec 11, 2025 | 589 products |
| 7 | Shark-Product Links | Dec 10, 2025 | 279 deals linked |
| 6 | Shark Seeding & Photos | Dec 10, 2025 | 47 sharks |
| 5 | Product Enrichment | Dec 10, 2025 | 589 enriched |
| 4 | Product Scraping | Dec 10, 2025 | 589 products |
| 3 | Database Schema | Dec 10, 2025 | |
| 2 | Project Memory Setup | Dec 10, 2025 | Migrated to Koda layout Jul 30, 2026 |
| 1 | Project Initialization | Dec 10, 2025 | |

## Current Status (as of Apr 25, 2026)

- **Products**: 666 total — 340 deals, 253 no deal, 72 fell through; all narrative-enriched; 665/666 with photos; Season 17 covered through E18
- **Sharks**: 47 (8 main + 39 guest); all enriched with photos; 279 deal products linked via `product_sharks`
- **Frontend**: All core pages shipped (home, listings, detail pages, categories, seasons, episodes, SEO pages)
- **Stack**: Next.js 16.1.6, React 19.2.4, Supabase, Tailwind CSS 4.2, Zod 4, Playwright
- **Site**: Live at https://tankd.io since Dec 12, 2025

## Up Next

- [ ] Fix 5 products whose `amazon_url` is a bare slug (e.g. `amazon.com/clean-bottle`) and 404s — those clicks earn nothing
- [ ] Affiliate link management system
- [ ] Email alerts for new episodes
- [ ] Admin dashboard for content management
