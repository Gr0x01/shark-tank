# Project Brief: tankd.io

A comprehensive directory of every product ever pitched on Shark Tank, with real-time tracking of business status, where to buy, and deal details. Built to outcompete existing sites through better data freshness, filtering, and affiliate optimization.

> [!NOTE]
> **Status**: Live at https://tankd.io since Dec 12, 2025 — currently in Phase 4 (Launch & Growth).

## Core Purpose

Solve the problem of finding reliable, up-to-date information about Shark Tank products:

- Is this product still in business?
- Where can I buy it now?
- What was the deal (or did they get one)?
- Which shark invested?

## Target Users

- **Shark Tank viewers** wanting to buy products they saw on the show
- **Researchers** tracking business outcomes from the show
- **Gift shoppers** looking for unique products with a story
- **Deal hunters** finding products at the best prices

## Key Differentiators (vs allsharktankproducts.com)

1. **"Still in business" tracking** — prominent status badges, freshness dates
2. **Deal filtering** — filter by shark, deal size, equity, got-deal vs no-deal
3. **Rich shark pages** — portfolio stats, success rates, investment patterns
4. **Where to buy aggregation** — Amazon, Target, Costco, direct site
5. **Freshness signals** — "Last verified: [date]" builds trust
6. **Fast episode coverage** — new episodes indexed within 24–48 hours
7. **Mobile-first UX** — clean, fast, not ad-cluttered

## Key Features

### Core Functionality
- **Product pages** with status, deal details, where to buy
- **Shark portfolio pages** with stats and success rates
- **Season/episode archives** with all products
- **Category browsing** (food, tech, pets, fitness, etc.)
- **Advanced filtering** by status, shark, deal size, price range

### Monetization
- Amazon Associates (1–4% commission)
- Direct brand affiliate programs (5–15%)
- ShareASale/CJ for brands with programs

### Content Strategy
- **Product pages** rank for "[product name] shark tank"
- **"Still in business" pages** rank for "[product] still in business"
- **Failed products** content for morbid curiosity traffic
- **Latest episode** pages capture search spikes within 24–48 hrs

## Success Metrics

- **Traffic**: Compete with 71k monthly visits (competitor benchmark)
- **Data freshness**: 95%+ products verified within 90 days
- **Affiliate revenue**: Track conversion rates by product/category
- **Episode speed**: New products indexed within 48 hours of airing

## Scope & Boundaries

### In Scope
- All Shark Tank US products (17 seasons, 1,100+ products)
- Business status tracking (active, closed, acquired, unknown)
- Deal details (amount, equity, shark, valuation)
- Where to buy links (Amazon, retail, direct)
- Shark profiles and portfolio stats

### Out of Scope (for now)
- International versions (UK, Australia, etc.)
- User accounts or reviews
- Real-time inventory checking

## Phases

| Phase | Scope | Status |
|-------|-------|--------|
| 1 — Foundation | Scaffolding, schema, data model | ✅ Complete (Dec 10, 2025) |
| 2 — MVP | Core pages, filtering, 589 products loaded, affiliate links | ✅ Complete (Dec 10, 2025) |
| 3 — Differentiation | Status verification, freshness, narratives, automated ingestion, cron jobs | ✅ Complete (Dec 12, 2025) |
| 4 — Launch & Growth | Google indexing, link building, weekly episode workflow, SEO monitoring | 🚀 Current |

## Technical Constraints

- **Budget-conscious**: Free tiers where possible (Supabase free, Vercel Pro)
- **Data accuracy**: No hallucinated products, verified links only
- **Performance**: Fast filtering, instant search
- **SEO-first**: Static generation where possible
