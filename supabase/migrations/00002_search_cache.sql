-- Search cache for Tavily API results

CREATE TABLE search_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type TEXT NOT NULL,
    entity_id UUID,
    entity_name TEXT,
    query TEXT NOT NULL,
    query_hash TEXT NOT NULL,
    results JSONB NOT NULL DEFAULT '[]',
    result_count INTEGER DEFAULT 0,
    source TEXT DEFAULT 'tavily',
    fetched_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

CREATE INDEX idx_search_cache_query_hash ON search_cache(query_hash);
CREATE INDEX idx_search_cache_entity ON search_cache(entity_type, entity_id);
CREATE INDEX idx_search_cache_expires ON search_cache(expires_at);
