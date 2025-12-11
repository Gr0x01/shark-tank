/**
 * Apply shark narrative migration
 */

import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function runMigration() {
  console.log('🚀 Checking shark narrative migration...\n');

  // Check if columns exist by querying
  const { data: testData, error: testError } = await supabase
    .from('sharks')
    .select('narrative_content, narrative_version, narrative_generated_at')
    .limit(1);

  if (testError) {
    console.error('❌ Columns do not exist yet. Migration needed.');
    console.log('\n📝 Please run this SQL manually in Supabase SQL Editor:');
    console.log(`
-- Add narrative content fields for rich shark pages

ALTER TABLE sharks
    ADD COLUMN narrative_content JSONB DEFAULT '{}',
    ADD COLUMN narrative_version INTEGER DEFAULT 0,
    ADD COLUMN narrative_generated_at TIMESTAMPTZ;

CREATE INDEX idx_sharks_narrative_version ON sharks(narrative_version)
    WHERE narrative_version = 0 OR narrative_version IS NULL;

COMMENT ON COLUMN sharks.narrative_content IS 'Rich editorial content. Structure: {biography, investment_philosophy, shark_tank_journey, notable_deals, beyond_the_tank}';
COMMENT ON COLUMN sharks.narrative_version IS 'Version number for narrative content, 0 = needs generation';
COMMENT ON COLUMN sharks.narrative_generated_at IS 'Timestamp when narrative was last generated';
    `);
    console.log('\nOr apply via file: supabase/migrations/00006_shark_narrative_content.sql');
    process.exit(1);
  }

  console.log('✓ Migration columns exist');
  console.log('✓ Ready to enrich shark narratives');
  console.log('\nTest query result:', testData);
}

runMigration().catch(console.error);
