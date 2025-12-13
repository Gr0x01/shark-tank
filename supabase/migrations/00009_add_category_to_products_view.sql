-- Add category information to products_with_sharks view
-- Migration: 00009_add_category_to_products_view
-- Purpose: Include category name and slug for product pages to enable category-based
--          internal linking, breadcrumbs, and related products sections

-- Drop existing view
DROP VIEW IF EXISTS products_with_sharks;

-- Recreate view with category information
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
    ) as shark_slugs,
    c.name as category_name,
    c.slug as category_slug
FROM products p
LEFT JOIN product_sharks ps ON p.id = ps.product_id
LEFT JOIN sharks s ON ps.shark_id = s.id
LEFT JOIN categories c ON p.category_id = c.id
GROUP BY p.id, c.name, c.slug;

-- Add comment for documentation
COMMENT ON VIEW products_with_sharks IS 'Aggregated view joining products with sharks and category information for efficient querying. Includes shark names/slugs and category name/slug for SEO and navigation.';
