-- Migration: Add RPC function for shark co-investors
-- This function returns sharks who frequently invest alongside a target shark

CREATE OR REPLACE FUNCTION get_shark_co_investors(
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
) AS $$
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
  FROM product_sharks ps1
  INNER JOIN product_sharks ps2 ON ps1.product_id = ps2.product_id AND ps1.shark_id != ps2.shark_id
  INNER JOIN sharks s2 ON ps2.shark_id = s2.id
  INNER JOIN products p ON ps1.product_id = p.id
  WHERE ps1.shark_id = target_shark_id
  GROUP BY s2.id, s2.name, s2.slug, s2.photo_url
  HAVING COUNT(DISTINCT ps1.product_id) >= min_deals
  ORDER BY deal_count DESC
  LIMIT 5;
END;
$$ LANGUAGE plpgsql;
