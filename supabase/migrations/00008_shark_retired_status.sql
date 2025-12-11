-- Add is_retired field to sharks table
-- Migration: 00008_shark_retired_status
-- Purpose: Track sharks who are no longer on Shark Tank (retired/left the show)

ALTER TABLE sharks
    ADD COLUMN is_retired BOOLEAN DEFAULT FALSE;

-- Add comment for documentation
COMMENT ON COLUMN sharks.is_retired IS 'Indicates if shark is no longer on Shark Tank';

-- Create index for filtering active sharks
CREATE INDEX idx_sharks_is_retired ON sharks(is_retired);

-- Update known retired sharks
-- Mark Cuban announced retirement after Season 16 (2024)
-- Kevin Harrington left after Season 2 (2011)
UPDATE sharks SET is_retired = TRUE
WHERE slug IN ('mark-cuban', 'kevin-harrington');
