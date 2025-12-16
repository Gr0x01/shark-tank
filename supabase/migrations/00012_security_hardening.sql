-- Security Hardening Migration
-- Fixes:
-- 1. Views with SECURITY DEFINER → Recreate with SECURITY INVOKER
-- 2. Functions without search_path → Add SET search_path = ''

-- ===========================================
-- FIX VIEWS: Recreate with SECURITY INVOKER
-- ===========================================

-- Drop and recreate products_with_sharks with SECURITY INVOKER
DROP VIEW IF EXISTS products_with_sharks;

CREATE VIEW products_with_sharks
WITH (security_invoker = true)
AS
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
FROM public.products p
LEFT JOIN public.product_sharks ps ON p.id = ps.product_id
LEFT JOIN public.sharks s ON ps.shark_id = s.id
LEFT JOIN public.categories c ON p.category_id = c.id
GROUP BY p.id, c.name, c.slug;

COMMENT ON VIEW products_with_sharks IS 'Aggregated view joining products with sharks and category information. Uses SECURITY INVOKER for RLS compliance.';

-- Drop and recreate shark_stats with SECURITY INVOKER
DROP VIEW IF EXISTS shark_stats;

CREATE VIEW shark_stats
WITH (security_invoker = true)
AS
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
FROM public.sharks s
LEFT JOIN public.product_sharks ps ON s.id = ps.shark_id
LEFT JOIN public.products p ON ps.product_id = p.id
GROUP BY s.id, s.name, s.slug;

COMMENT ON VIEW shark_stats IS 'Aggregated shark statistics view. Uses SECURITY INVOKER for RLS compliance.';

-- ===========================================
-- FIX FUNCTIONS: Add search_path security
-- ===========================================

-- Fix update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Fix get_shark_co_investors
CREATE OR REPLACE FUNCTION public.get_shark_co_investors(
  target_shark_id UUID,
  min_deals INT DEFAULT 3
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  slug TEXT,
  photo_url TEXT,
  deal_count BIGINT,
  success_rate NUMERIC
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT
    s2.id,
    s2.name,
    s2.slug,
    s2.photo_url,
    COUNT(DISTINCT ps1.product_id) as deal_count,
    ROUND(
      COUNT(DISTINCT CASE WHEN p.status = 'active' THEN ps1.product_id END)::NUMERIC /
      NULLIF(COUNT(DISTINCT ps1.product_id), 0) * 100,
      1
    ) as success_rate
  FROM public.product_sharks ps1
  INNER JOIN public.product_sharks ps2 ON ps1.product_id = ps2.product_id AND ps1.shark_id != ps2.shark_id
  INNER JOIN public.sharks s2 ON ps2.shark_id = s2.id
  INNER JOIN public.products p ON ps1.product_id = p.id
  WHERE ps1.shark_id = target_shark_id
  GROUP BY s2.id, s2.name, s2.slug, s2.photo_url
  HAVING COUNT(DISTINCT ps1.product_id) >= min_deals
  ORDER BY deal_count DESC
  LIMIT 5;
END;
$$;

-- Fix flag_narrative_refresh_on_status_change
CREATE OR REPLACE FUNCTION public.flag_narrative_refresh_on_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
    -- Only flag if status actually changed and narrative exists
    IF NEW.status IS DISTINCT FROM OLD.status AND OLD.narrative_version > 0 THEN
        NEW.narrative_version := 0;
        NEW.narrative_refresh_scheduled_at := NULL;  -- Clear any pending scheduled refresh

        RAISE NOTICE 'Product % status changed from % to %. Flagging narrative for immediate refresh.',
            NEW.name, OLD.status, NEW.status;
    END IF;

    RETURN NEW;
END;
$$;

-- Fix flag_product_for_narrative_refresh
CREATE OR REPLACE FUNCTION public.flag_product_for_narrative_refresh(product_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
    UPDATE public.products
    SET narrative_version = 0
    WHERE id = product_id AND narrative_version > 0;

    RETURN FOUND;
END;
$$;

-- Fix schedule_narrative_refresh_on_deal_change
CREATE OR REPLACE FUNCTION public.schedule_narrative_refresh_on_deal_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
    -- Check if any deal-related fields changed
    IF (
        NEW.deal_outcome IS DISTINCT FROM OLD.deal_outcome OR
        NEW.deal_amount IS DISTINCT FROM OLD.deal_amount OR
        NEW.deal_equity IS DISTINCT FROM OLD.deal_equity OR
        NEW.royalty_deal IS DISTINCT FROM OLD.royalty_deal OR
        NEW.royalty_terms IS DISTINCT FROM OLD.royalty_terms OR
        NEW.deal_notes IS DISTINCT FROM OLD.deal_notes OR
        NEW.asking_amount IS DISTINCT FROM OLD.asking_amount OR
        NEW.asking_equity IS DISTINCT FROM OLD.asking_equity
    ) THEN
        -- Only schedule if narrative wasn't already flagged for immediate refresh
        IF NEW.narrative_version > 0 THEN
            -- Schedule refresh for 1 hour from now
            NEW.narrative_refresh_scheduled_at := NOW();

            RAISE NOTICE 'Product % deal details changed. Narrative refresh scheduled for 1 hour from now.',
                NEW.name;
        ELSE
            RAISE NOTICE 'Product % deal details changed, but narrative already flagged for immediate refresh. Skipping scheduled refresh.',
                NEW.name;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- Fix process_scheduled_narrative_refreshes
CREATE OR REPLACE FUNCTION public.process_scheduled_narrative_refreshes()
RETURNS TABLE(product_id UUID, product_name TEXT, scheduled_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
    RETURN QUERY
    WITH to_process AS (
        SELECT p.id, p.narrative_refresh_scheduled_at
        FROM public.products p
        WHERE
            p.narrative_refresh_scheduled_at IS NOT NULL
            AND p.narrative_refresh_scheduled_at < (NOW() - INTERVAL '1 hour')
            AND p.narrative_version > 0
        FOR UPDATE SKIP LOCKED
    ),
    flagged AS (
        UPDATE public.products p
        SET
            narrative_version = 0,
            narrative_refresh_scheduled_at = NULL
        FROM to_process tp
        WHERE p.id = tp.id
        RETURNING p.id, p.name, tp.narrative_refresh_scheduled_at
    )
    SELECT f.id, f.name, f.narrative_refresh_scheduled_at FROM flagged f;
END;
$$;

COMMENT ON FUNCTION public.process_scheduled_narrative_refreshes IS
    'Process scheduled narrative refreshes after 1-hour cooldown. Called by hourly cron job. Secured with search_path.';
