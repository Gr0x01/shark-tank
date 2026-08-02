# Changelog: tankd.io

Running log of shipped milestones. Newest first. Detailed Phase 1–3 implementation history is archived in `.koda/memory/archive/phase-1-3-history.md`.

## Milestones

| # | Name | Date | Notes |
|---|------|------|-------|
| 38 | Mobile-First Redesign + SEO Launch | Aug 2, 2026 | Deployed the redesigned homepage, mobile navigation, shark index/profiles, and product-page polish from `main` alongside SEO audit fixes #1–#5. Vercel completed successfully; the 725-page build and public phone-size checks covered navigation, sharks, product FAQs/schema, spoiler reveal, and `{year}` replacement |
| 37 | Product + Listing Structured Data | Aug 2, 2026 | Product pages now emit Product schema and 2–4 visible, matching FAQs; priced buy links can emit complete Offer data. ItemLists now contain the actual linked products, categories, or seasons shown across all listing pages |
| 36 | Crawlable Product Pagination + Episode Links | Aug 2, 2026 | `/products` now exposes all 664 products through stable 48-item pages with filter-preserving Previous/Next links, page-specific canonicals, and 404s for invalid pages. Product episode badges link to episode pages; historical episode pages now work even when the newer `episodes` table has no row |
| 35 | Social Sharing Image Fallbacks | Aug 2, 2026 | Replaced the unsupported default SVG with a 1200×630 PNG; product and shark pages now fall back to it when a photo is missing, with explicit image dimensions |
| 34 | Duplicate Product Pages Merged | Aug 2, 2026 | Wicked Good Cupcakes and The Bouqs Company each existed twice (Dec 2025 import); kept the stronger record of each, 308-redirected the dead URLs. Catalogue 666 → 664 |
| 33 | Shark Attribution Data Repair | Aug 2, 2026 | Merged duplicate Kevin O'Leary shark records (9 deals repointed, dupe deleted, old slug 308-redirects); linked the 2 deals that had no shark (Lovepop, Essence Aromatherapy Ring); removed Mark Cuban from Budsies, which got no deal. O'Leary now shows 62 deals / 74.2% success |
| 32 | Unique Meta Titles + Descriptions for All 666 Products | Aug 2, 2026 | `scripts/enrich-product-meta.ts` generates fact-specific copy from existing narratives (gpt-4.1-mini, Flex, $0.19 total). 666/666 unique descriptions. Stored `{year}` token is substituted at render so freshness signals don't go stale |
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

## Current Status (as of Aug 2, 2026)

- **Products**: 664 total; all narrative-enriched with unique SEO titles and descriptions; 663/664 with photos; Season 17 complete through E18
- **Sharks**: 50 total, including 2 retired; every recorded deal has its investor linked
- **Frontend**: Mobile-first redesign live across the homepage, navigation, shark pages, and product pages; catalogue fully paginated and historical product-to-episode navigation restored
- **Stack**: Next.js 16.1.6, React 19.2.4, Supabase, Tailwind CSS 4.2, Zod 4, Playwright
- **Site**: Live at https://tankd.io; redesign + SEO audit #1–#5 deployed and publicly verified Aug 2, 2026

## Up Next

- [ ] Deploy SEO indexing hygiene fixes: real failure-page 404s, trustworthy sitemap dates, and search-only AI crawler access
- [ ] Fix 5 products whose `amazon_url` is a bare slug (e.g. `amazon.com/clean-bottle`) and 404s — those clicks earn nothing
- [ ] Affiliate link management system
- [ ] Email alerts for new episodes
- [ ] Admin dashboard for content management
