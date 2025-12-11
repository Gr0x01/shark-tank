-- Add narrative content fields for SEO-optimized product pages

-- Add narrative content columns to products
ALTER TABLE products
    ADD COLUMN narrative_content JSONB DEFAULT '{}',
    ADD COLUMN narrative_version INTEGER DEFAULT 0,
    ADD COLUMN narrative_generated_at TIMESTAMPTZ;

-- Index for finding products that need narrative generation
CREATE INDEX idx_products_narrative_version ON products(narrative_version)
    WHERE narrative_version = 0 OR narrative_version IS NULL;

-- Comment documenting the structure
COMMENT ON COLUMN products.narrative_content IS 'SEO-optimized long-form content. Structure: {origin_story, pitch_journey, deal_dynamics, after_tank, current_status, where_to_buy}';
COMMENT ON COLUMN products.narrative_version IS 'Version number for narrative content, 0 = needs generation';
COMMENT ON COLUMN products.narrative_generated_at IS 'Timestamp when narrative was last generated';

-- Update the products_with_sharks view to include narrative fields
DROP VIEW IF EXISTS products_with_sharks;

CREATE VIEW products_with_sharks AS
SELECT
    p.*,
    COALESCE(
        array_agg(DISTINCT s.name) FILTER (WHERE s.name IS NOT NULL),
        ARRAY[]::text[]
    ) as shark_names,
    COALESCE(
        array_agg(DISTINCT s.slug) FILTER (WHERE s.slug IS NOT NULL),
        ARRAY[]::text[]
    ) as shark_slugs
FROM products p
LEFT JOIN product_sharks ps ON p.id = ps.product_id
LEFT JOIN sharks s ON ps.shark_id = s.id
GROUP BY p.id;
