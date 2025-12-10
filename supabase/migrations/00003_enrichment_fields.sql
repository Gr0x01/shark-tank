-- Add enrichment fields for deal types and revenue tracking

-- Deal type enum
CREATE TYPE deal_type AS ENUM (
    'equity',
    'royalty', 
    'loan',
    'equity_plus_royalty',
    'equity_plus_loan',
    'contingent',
    'unknown'
);

-- Add new columns to products
ALTER TABLE products
    ADD COLUMN deal_type deal_type DEFAULT 'unknown',
    ADD COLUMN royalty_percent NUMERIC(5, 2) CHECK (royalty_percent IS NULL OR (royalty_percent > 0 AND royalty_percent <= 100)),
    ADD COLUMN lifetime_revenue NUMERIC(14, 2),
    ADD COLUMN annual_revenue NUMERIC(14, 2),
    ADD COLUMN revenue_year INTEGER CHECK (revenue_year IS NULL OR (revenue_year >= 2009 AND revenue_year <= 2030));

-- Index for filtering by deal type
CREATE INDEX idx_products_deal_type ON products(deal_type);
