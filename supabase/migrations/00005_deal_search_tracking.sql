-- Track deal search attempts for daily cron
-- This allows the daily-enrich-pending.ts script to know when to stop retrying

ALTER TABLE products
ADD COLUMN IF NOT EXISTS deal_search_attempts INTEGER DEFAULT 0;

-- Index for efficient querying of products needing deal search
CREATE INDEX IF NOT EXISTS idx_products_deal_unknown
ON products(deal_outcome, deal_search_attempts, last_enriched_at)
WHERE deal_outcome = 'unknown';
