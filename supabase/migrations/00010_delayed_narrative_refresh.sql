-- Delayed Narrative Refresh System
-- Problem: When watching episodes live, deal details are updated incrementally (offer → counter → final deal)
-- Solution: Schedule narrative refresh 1 hour after last change, so multiple edits batch together

-- Add timestamp field to track when narrative refresh should be scheduled
ALTER TABLE products ADD COLUMN IF NOT EXISTS narrative_refresh_scheduled_at TIMESTAMPTZ;

-- Update the status change trigger (from migration 00007) to clear scheduled refreshes
-- This ensures immediate refresh takes precedence over delayed refresh
CREATE OR REPLACE FUNCTION flag_narrative_refresh_on_status_change()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

CREATE INDEX IF NOT EXISTS idx_products_narrative_refresh_scheduled
    ON products(narrative_refresh_scheduled_at)
    WHERE narrative_refresh_scheduled_at IS NOT NULL AND narrative_version > 0;

-- Trigger function to schedule narrative refresh when deal fields change
CREATE OR REPLACE FUNCTION schedule_narrative_refresh_on_deal_change()
RETURNS TRIGGER AS $$
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
        -- (e.g., by the status change trigger which runs alphabetically before this one)
        IF NEW.narrative_version > 0 THEN
            -- Schedule refresh for 1 hour from now (timestamp will be checked by cron)
            NEW.narrative_refresh_scheduled_at := NOW();

            RAISE NOTICE 'Product % deal details changed. Narrative refresh scheduled for 1 hour from now.',
                NEW.name;
        ELSE
            RAISE NOTICE 'Product % deal details changed, but narrative already flagged for immediate refresh (narrative_version = 0). Skipping scheduled refresh.',
                NEW.name;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to products table
DROP TRIGGER IF EXISTS trigger_schedule_narrative_refresh_on_deal_change ON products;

CREATE TRIGGER trigger_schedule_narrative_refresh_on_deal_change
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION schedule_narrative_refresh_on_deal_change();

-- Function to process scheduled narrative refreshes (called by hourly cron)
-- Finds products where last change was > 1 hour ago and flags them for enrichment
CREATE OR REPLACE FUNCTION process_scheduled_narrative_refreshes()
RETURNS TABLE(product_id UUID, product_name TEXT, scheduled_at TIMESTAMPTZ) AS $$
BEGIN
    RETURN QUERY
    WITH to_process AS (
        SELECT id, narrative_refresh_scheduled_at
        FROM products
        WHERE
            narrative_refresh_scheduled_at IS NOT NULL
            AND narrative_refresh_scheduled_at < (NOW() - INTERVAL '1 hour')
            AND narrative_version > 0  -- Only flag if narrative exists
        FOR UPDATE SKIP LOCKED  -- Skip rows locked by concurrent transactions
    ),
    flagged AS (
        UPDATE products p
        SET
            narrative_version = 0,
            narrative_refresh_scheduled_at = NULL
        FROM to_process tp
        WHERE p.id = tp.id
        RETURNING p.id, p.name, tp.narrative_refresh_scheduled_at
    )
    SELECT id, name, narrative_refresh_scheduled_at FROM flagged;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION process_scheduled_narrative_refreshes IS
    'Process scheduled narrative refreshes after 1-hour cooldown. Called by hourly cron job.';

COMMENT ON COLUMN products.narrative_refresh_scheduled_at IS
    'Timestamp when narrative refresh was last scheduled. After 1 hour of no changes, cron will flag for refresh.';
