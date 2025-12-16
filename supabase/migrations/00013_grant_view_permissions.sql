-- Grant SELECT permissions on views to public roles
-- Required because views use SECURITY INVOKER (migration 00012)
-- which means they run with the caller's permissions

GRANT SELECT ON products_with_sharks TO anon, authenticated;
GRANT SELECT ON shark_stats TO anon, authenticated;
