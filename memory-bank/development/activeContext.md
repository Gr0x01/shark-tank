---
Last-Updated: 2025-12-10
Maintainer: RB
Status: Phase 1 - Project Setup
---

# Active Context: Shark Tank Products

## Current Status
- **Phase**: 1 - Project Setup
- **Mode**: Initial scaffolding
- **Focus**: Memory bank + Next.js project initialization

## Phase 1 Tasks

### Completed
- [x] Memory bank copied from chefs project
- [x] CLAUDE.md cleaned (removed chef-specific content)
- [x] Core memory bank files updated for shark-tank

### In Progress
- [ ] Architecture files cleanup
- [ ] Next.js project initialization

### Next Up
- [ ] Database schema design (products, sharks, episodes)
- [ ] Supabase project setup
- [ ] Basic page scaffolding

## Data Model (Draft)

### Core Tables
```
products
  - id, name, slug
  - season, episode, air_date
  - description, category
  - asking_amount, asking_equity
  - deal_amount, deal_equity
  - sharks[] (who invested)
  - status (active, out_of_business, acquired, unknown)
  - website_url, amazon_url
  - retail_availability (json)
  - price_range
  - last_verified
  - photo_url

sharks
  - id, name, slug
  - bio, photo_url
  - seasons_active
  - total_deals, total_invested

episodes
  - id, season, episode_number
  - air_date, title
  - products[] (references)

product_updates (freshness tracking)
  - product_id
  - field_changed
  - old_value, new_value
  - updated_at, source
```

## Site Architecture (Target)
```
/                           Homepage
/products                   All products (filterable)
/products/[slug]            Product page
/sharks                     All sharks
/sharks/[slug]              Shark portfolio
/seasons                    Season archive
/seasons/[number]           Season page
/episodes/[season]/[ep]     Episode page
/categories/[slug]          Category pages
/still-in-business          Active products
/out-of-business            Failed products
```

## Key Decisions Pending
- [ ] Initial data source (Wikipedia scrape vs manual entry)
- [ ] Status verification approach (automated vs manual)
- [ ] Photo sourcing strategy
