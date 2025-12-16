-- Enable Row Level Security on all tables
-- Strategy: Public read access, service role only for writes
-- This is appropriate for tankd.io which is a public read-only site
-- with admin-only writes via service role key

-- ===========================================
-- ENABLE RLS ON ALL TABLES
-- ===========================================

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sharks ENABLE ROW LEVEL SECURITY;
ALTER TABLE episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_sharks ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_cache ENABLE ROW LEVEL SECURITY;

-- ===========================================
-- PUBLIC READ POLICIES (anon + authenticated)
-- ===========================================

-- Products: Public read
CREATE POLICY "Products are publicly readable"
ON products FOR SELECT
TO anon, authenticated
USING (true);

-- Sharks: Public read
CREATE POLICY "Sharks are publicly readable"
ON sharks FOR SELECT
TO anon, authenticated
USING (true);

-- Episodes: Public read
CREATE POLICY "Episodes are publicly readable"
ON episodes FOR SELECT
TO anon, authenticated
USING (true);

-- Categories: Public read
CREATE POLICY "Categories are publicly readable"
ON categories FOR SELECT
TO anon, authenticated
USING (true);

-- Product-Sharks junction: Public read
CREATE POLICY "Product-shark relationships are publicly readable"
ON product_sharks FOR SELECT
TO anon, authenticated
USING (true);

-- Product Updates: Public read (for freshness tracking display)
CREATE POLICY "Product updates are publicly readable"
ON product_updates FOR SELECT
TO anon, authenticated
USING (true);

-- Search Cache: Public read (for cached search results)
CREATE POLICY "Search cache is publicly readable"
ON search_cache FOR SELECT
TO anon, authenticated
USING (true);

-- ===========================================
-- SERVICE ROLE WRITE POLICIES
-- Note: service_role bypasses RLS by default, but we add
-- explicit policies for clarity and if bypass is ever disabled
-- ===========================================

-- Products: Service role full access
CREATE POLICY "Service role can manage products"
ON products FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Sharks: Service role full access
CREATE POLICY "Service role can manage sharks"
ON sharks FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Episodes: Service role full access
CREATE POLICY "Service role can manage episodes"
ON episodes FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Categories: Service role full access
CREATE POLICY "Service role can manage categories"
ON categories FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Product-Sharks: Service role full access
CREATE POLICY "Service role can manage product-shark relationships"
ON product_sharks FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Product Updates: Service role full access
CREATE POLICY "Service role can manage product updates"
ON product_updates FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Search Cache: Service role full access
CREATE POLICY "Service role can manage search cache"
ON search_cache FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ===========================================
-- COMMENTS
-- ===========================================

COMMENT ON POLICY "Products are publicly readable" ON products IS
'Allow anonymous and authenticated users to read all product data';

COMMENT ON POLICY "Sharks are publicly readable" ON sharks IS
'Allow anonymous and authenticated users to read all shark data';

COMMENT ON POLICY "Episodes are publicly readable" ON episodes IS
'Allow anonymous and authenticated users to read all episode data';
