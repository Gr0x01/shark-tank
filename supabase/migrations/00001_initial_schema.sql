-- Shark Tank Products Directory
-- Initial Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===========================================
-- ENUMS
-- ===========================================

CREATE TYPE product_status AS ENUM ('active', 'out_of_business', 'acquired', 'unknown');
CREATE TYPE enrichment_status AS ENUM ('pending', 'enriched', 'failed', 'stale');
CREATE TYPE deal_outcome AS ENUM ('deal', 'no_deal', 'deal_fell_through', 'unknown');

-- ===========================================
-- SHARKS
-- ===========================================

CREATE TABLE sharks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    bio TEXT,
    seo_title TEXT,
    meta_description TEXT,
    investment_style TEXT,
    photo_url TEXT,
    seasons_active INTEGER[],
    is_guest_shark BOOLEAN DEFAULT FALSE,
    social_urls JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sharks_slug ON sharks(slug);

-- ===========================================
-- CATEGORIES
-- ===========================================

CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    meta_description TEXT,
    parent_id UUID REFERENCES categories(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_categories_slug ON categories(slug);
CREATE INDEX idx_categories_parent ON categories(parent_id);

-- ===========================================
-- EPISODES
-- ===========================================

CREATE TABLE episodes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    season INTEGER NOT NULL,
    episode_number INTEGER NOT NULL,
    air_date DATE,
    title TEXT,
    description TEXT,
    seo_title TEXT,
    meta_description TEXT,
    guest_sharks UUID[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(season, episode_number)
);

CREATE INDEX idx_episodes_season ON episodes(season);
CREATE INDEX idx_episodes_air_date ON episodes(air_date);

-- ===========================================
-- PRODUCTS
-- ===========================================

CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Basic Info
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    company_name TEXT,
    tagline TEXT,
    description TEXT,
    
    -- Episode Reference
    episode_id UUID REFERENCES episodes(id),
    season INTEGER,
    episode_number INTEGER,
    air_date DATE,
    
    -- Founders
    founder_names TEXT[],
    founder_story TEXT,
    
    -- Category
    category_id UUID REFERENCES categories(id),
    
    -- The Pitch
    asking_amount NUMERIC(12, 2),
    asking_equity NUMERIC(5, 2) CHECK (asking_equity IS NULL OR (asking_equity > 0 AND asking_equity <= 100)),
    asking_valuation NUMERIC(14, 2) GENERATED ALWAYS AS (
        CASE WHEN asking_equity > 0 THEN asking_amount / (asking_equity / 100)
        ELSE NULL END
    ) STORED,
    
    -- The Deal
    deal_outcome deal_outcome DEFAULT 'unknown',
    deal_amount NUMERIC(12, 2),
    deal_equity NUMERIC(5, 2) CHECK (deal_equity IS NULL OR (deal_equity > 0 AND deal_equity <= 100)),
    deal_valuation NUMERIC(14, 2) GENERATED ALWAYS AS (
        CASE WHEN deal_equity > 0 THEN deal_amount / (deal_equity / 100)
        ELSE NULL END
    ) STORED,
    royalty_deal BOOLEAN DEFAULT FALSE,
    royalty_terms TEXT,
    deal_notes TEXT,
    
    -- Current Status
    status product_status DEFAULT 'unknown',
    last_verified TIMESTAMPTZ,
    verification_notes TEXT,
    last_activity_date DATE,
    revenue_estimate TEXT,
    
    -- URLs & Availability
    website_url TEXT,
    amazon_url TEXT,
    retail_availability JSONB DEFAULT '{}',
    social_urls JSONB DEFAULT '{}',
    
    -- Pricing
    price_range TEXT,
    current_price NUMERIC(10, 2),
    original_pitch_price NUMERIC(10, 2),
    
    -- Media
    photo_url TEXT,
    video_url TEXT,
    
    -- SEO Content (LLM Generated)
    seo_title TEXT,
    meta_description TEXT,
    pitch_summary TEXT,
    outcome_story TEXT,
    
    -- Affiliate Tracking
    affiliate_links JSONB DEFAULT '{}',
    
    -- Enrichment Tracking
    enrichment_status enrichment_status DEFAULT 'pending',
    enrichment_source TEXT,
    last_enriched_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_season ON products(season);
CREATE INDEX idx_products_episode ON products(episode_id);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_enrichment ON products(enrichment_status);
CREATE INDEX idx_products_deal_outcome ON products(deal_outcome);

-- Performance indexes for common queries
CREATE INDEX idx_products_status_season ON products(status, season);
CREATE INDEX idx_products_air_date ON products(air_date DESC);
CREATE INDEX idx_products_last_verified ON products(last_verified) WHERE status = 'active';
CREATE INDEX idx_products_enrichment_pending ON products(enrichment_status, last_enriched_at) WHERE enrichment_status = 'pending';

-- ===========================================
-- PRODUCT_SHARKS (Junction Table)
-- ===========================================

CREATE TABLE product_sharks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    shark_id UUID NOT NULL REFERENCES sharks(id) ON DELETE CASCADE,
    investment_amount NUMERIC(12, 2),
    equity_percentage NUMERIC(5, 2),
    is_lead_investor BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(product_id, shark_id)
);

CREATE INDEX idx_product_sharks_product ON product_sharks(product_id);
CREATE INDEX idx_product_sharks_shark ON product_sharks(shark_id);

-- ===========================================
-- PRODUCT_UPDATES (Freshness Tracking)
-- ===========================================

CREATE TABLE product_updates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    field_changed TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    source TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_product_updates_product ON product_updates(product_id);
CREATE INDEX idx_product_updates_field ON product_updates(field_changed);
CREATE INDEX idx_product_updates_date ON product_updates(updated_at);

-- ===========================================
-- UPDATED_AT TRIGGER
-- ===========================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sharks_updated_at
    BEFORE UPDATE ON sharks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_episodes_updated_at
    BEFORE UPDATE ON episodes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- VIEWS FOR COMMON QUERIES
-- ===========================================

-- Products with shark names (for listing pages)
CREATE VIEW products_with_sharks AS
SELECT 
    p.*,
    COALESCE(
        ARRAY_AGG(s.name ORDER BY ps.is_lead_investor DESC) FILTER (WHERE s.id IS NOT NULL),
        '{}'
    ) AS shark_names,
    COALESCE(
        ARRAY_AGG(s.slug ORDER BY ps.is_lead_investor DESC) FILTER (WHERE s.id IS NOT NULL),
        '{}'
    ) AS shark_slugs
FROM products p
LEFT JOIN product_sharks ps ON p.id = ps.product_id
LEFT JOIN sharks s ON ps.shark_id = s.id
GROUP BY p.id;

-- Shark stats (for shark portfolio pages)
CREATE VIEW shark_stats AS
SELECT 
    s.id,
    s.name,
    s.slug,
    COUNT(DISTINCT ps.product_id) AS total_deals,
    SUM(ps.investment_amount) AS total_invested,
    COUNT(DISTINCT ps.product_id) FILTER (WHERE p.status = 'active') AS active_companies,
    COUNT(DISTINCT ps.product_id) FILTER (WHERE p.status = 'out_of_business') AS failed_companies,
    ROUND(
        COUNT(DISTINCT ps.product_id) FILTER (WHERE p.status = 'active')::NUMERIC / 
        NULLIF(COUNT(DISTINCT ps.product_id), 0) * 100,
        1
    ) AS success_rate
FROM sharks s
LEFT JOIN product_sharks ps ON s.id = ps.shark_id
LEFT JOIN products p ON ps.product_id = p.id
GROUP BY s.id, s.name, s.slug;

-- ===========================================
-- SEED DATA: Main Sharks
-- ===========================================

INSERT INTO sharks (name, slug, is_guest_shark) VALUES
    ('Mark Cuban', 'mark-cuban', FALSE),
    ('Barbara Corcoran', 'barbara-corcoran', FALSE),
    ('Daymond John', 'daymond-john', FALSE),
    ('Kevin O''Leary', 'kevin-oleary', FALSE),
    ('Lori Greiner', 'lori-greiner', FALSE),
    ('Robert Herjavec', 'robert-herjavec', FALSE);

-- ===========================================
-- SEED DATA: Common Categories  
-- ===========================================

INSERT INTO categories (name, slug) VALUES
    ('Food & Beverage', 'food-beverage'),
    ('Health & Wellness', 'health-wellness'),
    ('Fashion & Apparel', 'fashion-apparel'),
    ('Technology', 'technology'),
    ('Home & Garden', 'home-garden'),
    ('Pets', 'pets'),
    ('Children & Baby', 'children-baby'),
    ('Fitness', 'fitness'),
    ('Beauty & Personal Care', 'beauty-personal-care'),
    ('Automotive', 'automotive'),
    ('Sports & Outdoors', 'sports-outdoors'),
    ('Services', 'services'),
    ('Novelty & Gifts', 'novelty-gifts');
