# Changelog: tankd.io

Running log of shipped milestones. Newest first. Detailed Phase 1–3 implementation history is archived in `.koda/memory/archive/phase-1-3-history.md`.

## Milestones

| # | Name | Date | Notes |
|---|------|------|-------|
| 43 | Episode Air Dates | Aug 2, 2026 | `scripts/backfill-air-dates.ts` parses Wikipedia's per-season `{{Episode list}}` templates (structured `OriginalAirDate` fields, not model-summarised prose) and stamps products from their episode: 377 episodes across S1–S17, 761 products dated, 2009-09-13 → 2026-04-22. `Article.datePublished` now carries the real broadcast date instead of being omitted. `--fill-episodes` resolved 21 products that had a season but no episode number, including Scrub Daddy and Bombas. Fixed an off-by-one day found while verifying — a date-only column parsed as UTC midnight rendered the *previous* day in US Central, so Scrub Daddy's page said Oct 25 while its own schema said Oct 26; now centralised in `formatAirDate()`. Idempotent: **re-run after any batch that adds products** |
| 42 | Numbered Pagination + Paginated Sitemap | Aug 2, 2026 | `/products` gained numbered pages with first/last shortcuts and an elided window, so any page is two hops from the root instead of up to fourteen sequential Next clicks; the sitemap now carries the canonical `?page=2..N` URLs. `PRODUCTS_PER_PAGE` moved to `src/lib/seo/constants.ts` so the directory and sitemap can't drift into advertising pages that 404. Numbered links hide below 640px where Previous/Next still reaches everything |
| 44 | Catalogue Backfill — Seasons 1–15 | Aug 2, 2026 | Completed the backfill: 880 more products across the remaining fourteen seasons, taking the catalogue from 664 to **1,595** — every pitch the reference lists for seasons 1–16, plus our own Season 17. Added `--concurrency` to the backfill driver (8 workers took it from ~35s to ~5s per product, about 75 minutes instead of nine hours) with episode rows pre-created serially so workers can't race. Re-ran air dates (1,583 stamped) and meta (all 1,595 unique). Found and fixed a second shark bug: unnormalised name matching minted duplicate shark records, and a curly-apostrophe "Kevin O’Leary" had quietly collected 17 deals in a second record, re-breaking milestone 33 — now merged, with `normalizeSharkName()` applied on both sides of every lookup. Production build passes at 1,055 static pages |
| 41 | Catalogue Backfill — Season 16 | Aug 2, 2026 | Diffed the full show catalogue against sharktanksuccess.com's episode-by-episode list and found we held 594 of 1,440 pitches for seasons 1–16. Backfilled Season 16 as the first stage: 46 new products, each with deal, status, founders, photo, 6-section narrative, and search meta, plus real episode records linking them. Fixed a shark-attribution bug found during the check — the extraction prompt was crediting sharks who only *made an offer* (TRUFIT Customs listed four investors when Rashaun Williams alone closed it); this affected the Friday episode workflow too. Added `scripts/backfill-catalog.ts` with a fuzzy duplicate guard, since we store descriptive names ("Morrison Outdoors Sleeping Bags") where the reference uses short brands |
| 40 | SEO Truth & Freshness Pass | Aug 2, 2026 | Closed audit Blockers 1–3. Dropped the "every product / complete database" claims site-wide; rewrote `/how-to-apply` by hand from ABC's official casting pages (the old version invented a $100 fee and a Houston pitch weekend); made catalogue figures in editorial prose live tokens substituted at render, so they can't go stale again, and regenerated the four pages still quoting 589 products; retired the cosmetic `{year}` token from product copy in favour of the year each fact was actually researched; stopped Article schema claiming a December 2025 publication date for decade-old pitches. Also fixed `enrich-seo-pages.ts`, silently broken since the Zod 4 upgrade, and removed an invented "how we verify" section describing a research team that doesn't exist |
| 39 | SEO Audit Completion | Aug 2, 2026 | Closed audit #6–#8 and the final indexing pass: genuine 404/noindex handling across invalid routes, trustworthy sitemap dates, crawlable rendering assets, valid publisher schema, and answer-engine access while training crawlers remain blocked. Production build passed all 725 pages |
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

- **Products**: 1,595 — catalogue backfill complete (664 that morning). All narrative-enriched with unique meta; Season 17 complete through E18; 1,583 carry a real air date and 1,586 a photo; 0 duplicate slugs
- **Sharks**: 50, including 2 retired; every recorded deal has its investor linked. Three known duplicate records remain (`Daniel`, `Daniel Lubetsky`, `Rashaun L. Williams`) — merging them needs slug redirects, as milestone 33 did
- **Frontend**: Mobile-first redesign live across the homepage, navigation, shark pages, and product pages; catalogue paginated with numbered pages and historical product-to-episode navigation restored
- **Stack**: Next.js 16.1.6, React 19.2.4, Supabase, Tailwind CSS 4.2, Zod 4, Playwright (no test specs — see CLAUDE.md)
- **Site**: Live at https://tankd.io. Deployed through the Priority 3 SEO cleanup; **everything from milestone 39 onward is committed but not yet pushed**, awaiting one batched deploy. Production therefore lags this changelog — see `Documents/SEO Audit — Aug 2026.md`

## Up Next

- [ ] Push the batch and verify against production (see the SEO audit doc for the staged sequence). The batch is now much bigger — it takes the live site from 664 to 1,595 products
- [ ] Merge the 3 duplicate shark records with slug redirects; the bare `Daniel` record also blocks meta generation for Ryan's Barkery
- [ ] Fold the duplicate shark schema/prompt copies in `enrich-product.ts` and `daily-enrich-pending.ts` into the shared one — they missed both Aug 2 shark fixes
- [ ] Fix 5 products whose `amazon_url` is a bare slug (e.g. `amazon.com/clean-bottle`) and 404s — those clicks earn nothing
- [ ] Resolve 12 products with no air date: 6 rebranded (Ring/Doorbot, Poppi/Mother Beverage, Sleep Styler, Spatty, Chirp, The Swim Brief) and 6 with episodes that don't exist (S1E15, S2E15, S16E37)
- [ ] Affiliate link management system
- [ ] Email alerts for new episodes
- [ ] Admin dashboard for content management
