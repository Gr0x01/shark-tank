-- Add narrative content fields for rich shark pages

-- Add narrative content columns to sharks
ALTER TABLE sharks
    ADD COLUMN narrative_content JSONB DEFAULT '{}',
    ADD COLUMN narrative_version INTEGER DEFAULT 0,
    ADD COLUMN narrative_generated_at TIMESTAMPTZ;

-- Index for finding sharks that need narrative generation
CREATE INDEX idx_sharks_narrative_version ON sharks(narrative_version)
    WHERE narrative_version = 0 OR narrative_version IS NULL;

-- Comment documenting the structure
COMMENT ON COLUMN sharks.narrative_content IS 'Rich editorial content. Structure: {biography, investment_philosophy, shark_tank_journey, notable_deals, beyond_the_tank}';
COMMENT ON COLUMN sharks.narrative_version IS 'Version number for narrative content, 0 = needs generation';
COMMENT ON COLUMN sharks.narrative_generated_at IS 'Timestamp when narrative was last generated';
