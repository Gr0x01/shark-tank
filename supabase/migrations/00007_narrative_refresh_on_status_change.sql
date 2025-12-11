-- Trigger to refresh narrative content when product status changes
-- When status column is updated, reset narrative_version to 0 to flag for re-enrichment

CREATE OR REPLACE FUNCTION flag_narrative_refresh_on_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Only flag if status actually changed and narrative exists
    IF NEW.status IS DISTINCT FROM OLD.status AND OLD.narrative_version > 0 THEN
        NEW.narrative_version := 0;

        -- Log the change for debugging
        RAISE NOTICE 'Product % status changed from % to %. Flagging narrative for refresh.',
            NEW.name, OLD.status, NEW.status;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to products table
DROP TRIGGER IF EXISTS trigger_narrative_refresh_on_status_change ON products;

CREATE TRIGGER trigger_narrative_refresh_on_status_change
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION flag_narrative_refresh_on_status_change();

-- Also create a helper function to manually flag products for narrative refresh
CREATE OR REPLACE FUNCTION flag_product_for_narrative_refresh(product_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE products
    SET narrative_version = 0
    WHERE id = product_id AND narrative_version > 0;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION flag_product_for_narrative_refresh IS
    'Manually flag a product for narrative re-enrichment by resetting narrative_version to 0';
