---
Last-Updated: 2025-12-10
Maintainer: RB
Status: Defined
---

# Project Brief: tankd.io

## Project Overview
A comprehensive directory of every product ever pitched on Shark Tank, with real-time tracking of business status, where to buy, and deal details. Built to outcompete existing sites through better data freshness, filtering, and affiliate optimization.

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
1. **"Still in business" tracking** - Prominent status badges, freshness dates
2. **Deal filtering** - Filter by shark, deal size, equity, got-deal vs no-deal
3. **Rich shark pages** - Portfolio stats, success rates, investment patterns
4. **Where to buy aggregation** - Amazon, Target, Costco, direct site
5. **Freshness signals** - "Last verified: [date]" builds trust
6. **Fast episode coverage** - New episodes indexed within 24-48 hours
7. **Mobile-first UX** - Clean, fast, not ad-cluttered

## Key Features

### Core Functionality
- **Product pages** with status, deal details, where to buy
- **Shark portfolio pages** with stats and success rates
- **Season/episode archives** with all products
- **Category browsing** (food, tech, pets, fitness, etc.)
- **Advanced filtering** by status, shark, deal size, price range

### Monetization
- Amazon Associates (1-4% commission)
- Direct brand affiliate programs (5-15%)
- ShareASale/CJ for brands with programs

### Content Strategy
- **Product pages** rank for "[product name] shark tank"
- **"Still in business" pages** rank for "[product] still in business"
- **Failed products** content for morbid curiosity traffic
- **Latest episode** pages capture search spikes within 24-48hrs

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
- Reservation/booking integration
- User accounts or reviews
- Real-time inventory checking

## Timeline & Phases

### Phase 1: Foundation (Current)
- Project scaffolding and memory bank
- Database schema design
- Basic Next.js app structure
- Initial data model

### Phase 2: MVP
- Core pages (product, shark, season, episode)
- Basic filtering and search
- Initial data load (seed from Wikipedia/public sources)
- Affiliate link integration

### Phase 3: Differentiation
- Status verification system
- Freshness tracking and badges
- Advanced shark portfolio stats
- Episode alert system for new airings

### Phase 4: Scale
- Full historical data (all 17 seasons)
- Automated status checking
- SEO optimization
- Analytics and conversion tracking

## Technical Constraints
- **Budget-conscious**: Free tiers initially (Vercel, Supabase)
- **Data accuracy**: No hallucinated products, verified links only
- **Performance**: Fast filtering, instant search
- **SEO-first**: Static generation where possible

## Risks & Assumptions

### Key Risks
- **Data sourcing**: Initial scraping/manual entry effort
- **Freshness maintenance**: Products go out of business constantly
- **Affiliate approval**: Amazon Associates needs live site first

### Assumptions
- Wikipedia/public sources have good baseline data
- Shark Tank viewership creates sustained search demand
- Better UX + freshness can capture market share
