# Monitoring & Troubleshooting

Operational checklists for keeping tankd.io healthy and growing: monitoring cadence, SEO/growth playbook, costs, and fixes for common problems.

## Monitoring Cadence

**Daily** (2 minutes):
- [ ] Vercel Dashboard → Functions → check cron execution: `/api/cron/daily-enrich` (10am UTC), `/api/cron/process-narrative-refreshes` (every 3h), `/api/cron/auto-episode-check` (6am UTC)
- [ ] Supabase Dashboard → Performance: query time <100ms avg
- [ ] PostHog → [Traffic & Affiliate Revenue dashboard](https://us.posthog.com/project/534816/dashboard/1928563): traffic and Amazon clicks both moving

**Weekly** (10 minutes):
- [ ] Google Search Console: coverage report, indexing progress
- [ ] Vercel Analytics: error rate <1%
- [ ] PostHog → Core Web Vitals: any page slipping into "poor" hurts SEO ranking
- [ ] PostHog → billing: session replay under 5,000/month (see Analytics below)
- [ ] Cost check: OpenAI + Tavily usage (~$3–4/month expected)
- [ ] Reddit r/sharktank: engage on 1–2 posts about the recent episode

**Monthly** (30 minutes):
- [ ] Google Search Console: search performance (impressions, clicks, CTR)
- [ ] External links audit: Google `site:tankd.io` to see who's linking
- [ ] Content freshness: check products with stale `last_verified` dates
- [ ] Cost analysis: total API spend vs budget

## Google Search Console

**Manual indexing requests** (GSC → URL Inspection → Request Indexing). Priority pages:
- Home: `https://tankd.io`
- `https://tankd.io/products` and `https://tankd.io/sharks`
- Top product pages (Bombas, Scrub Daddy, Ring, Squatty Potty, Tipsy Elves)
- `https://tankd.io/still-in-business`

**Expected timelines**: manual indexing 2–7 days; full site 1–4 weeks. If "Discovered – not indexed" persists past 3 weeks, request manual indexing for those pages.

## Link Building Playbook

- **Reddit** (1–2x/week): helpful comments in r/sharktank mentioning tankd.io when relevant. Avoid spammy self-promotion.
- **Product Hunt**: launch after Google indexes 50+ pages. Tagline idea: "Every Shark Tank product, deal & business status in one place."
- **Social** (2–3x/week, not daily): Twitter/X episode updates and success stories; LinkedIn data insights (e.g., "40% of Shark Tank deals fail within 5 years").

## Analytics

Two tools run side by side: **PostHog** (product analytics, session replay, Core Web Vitals, error tracking) and **GA4** (kept for continuity and the Google ecosystem). Plausible was removed Jul 30, 2026 — PostHog covers what it did.

**Start here:** [Traffic & Affiliate Revenue](https://us.posthog.com/project/534816/dashboard/1928563) (pinned). The two questions it answers:

| Question | Tile |
|----------|------|
| Is SEO traffic growing? | Traffic: pageviews & unique visitors · Top pages · Where visitors come from |
| Are visitors clicking Amazon links? | Visitor → Amazon click conversion · Affiliate clicks over time · by CTA placement · Top products |

**Affiliate clicks** come from the `affiliate_link_clicked` event, fired by `src/components/ui/AffiliateLink.tsx`. Its `placement` property (`hero`, `mid_page`, `where_to_buy`, `sticky_bar`) is what makes "which CTA works" answerable — so **any new Amazon CTA must use `AffiliateLink`, never a plain `<a>`**, or its clicks go uncounted.

> [!WARNING]
> **Free tier: 1M events + 5,000 session replays/month.** Replay is sampled at 30% with a 5s minimum to stretch that. Billing is capped at $0, so exceeding a limit **pauses ingestion until next month** rather than charging you — you lose data silently instead of getting a bill. Check the replay count monthly if traffic is climbing.

**Things that look broken but aren't:**
- **No replays from localhost.** Replay is locked to `tankd.io` (the project token is public in client JS). Events still capture locally; only replay is domain-restricted.
- **Nothing from Playwright/E2E runs.** posthog-js filters headless browsers as bots, so driving the site with Playwright cannot pollute analytics.
- **Your own browsing is excluded** from dashboard tiles — localhost traffic is flagged as an internal user and every tile filters test accounts.

## Costs

**Current monthly** (~$3.82 API + $20 Vercel Pro):
| Service | Cost |
|---------|------|
| Vercel Pro | $20/month |
| Supabase | $0 (free tier) |
| OpenAI API | ~$0.20/month (Flex tier) |
| Tavily API | ~$3.60/month |
| GA4 + PostHog | $0 (free tiers) |

> [!WARNING]
> Investigate if: OpenAI >$10/month (runaway cron?), Tavily >$20/month (over-enriching?), Vercel bandwidth >100GB/month (viral traffic — good problem).

**When to scale**: >10k daily visitors → upgrade Supabase; >2,000 products → optimize batch enrichment; API >$50/month → review enrichment triggers and cron frequency.

## Troubleshooting

**Cron job failed**
- Check: Vercel Dashboard → Functions → filter `/api/cron/` (401 = bad CRON_SECRET, 500 = script error, timeout = reduce `--limit`)
- Re-run manually: `npx tsx scripts/daily-enrich-pending.ts` / `npx tsx scripts/process-narrative-refreshes.ts`

**Product narrative not refreshing**
- Check: `SELECT narrative_refresh_scheduled_at, narrative_version FROM products WHERE slug = 'product-slug';`
- Fix: `SELECT flag_product_for_narrative_refresh('product-uuid');`

**Search Console "Discovered – not indexed"**
- Likely cause: many pages submitted at once. Request manual indexing for top pages; wait 2–3 weeks.

**Site down or slow**
- Check Vercel Deployments (recent deploy?) and Supabase Performance (query spike?)
- Rollback: Vercel Dashboard → Deployments → previous version → Promote to Production

**Database migration failed**
- Migrations are one-way — restore from Supabase backup if needed
- Prevention: always test locally with `npx supabase db push` first

## Domain Configuration (DO NOT CHANGE)

Canonical domain: **`tankd.io`** (non-www).

| Domain | Config | Notes |
|--------|--------|-------|
| `tankd.io` | Production (primary) | All canonical URLs use this |
| `www.tankd.io` | 308 redirect → `tankd.io` | Permanent redirect for SEO |
| `shark-tank-flame.vercel.app` | Production | Vercel default, leave as-is |

> [!CAUTION]
> Do not flip this. All code (sitemaps, canonicals, OG tags) uses `https://tankd.io`, and Google has it indexed as non-www. In Dec 2025 the config was accidentally inverted (tankd.io redirecting TO www) — fixed Dec 22, 2025. Switching would mean code changes everywhere plus weeks of Google re-indexing.
