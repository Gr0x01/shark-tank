/**
 * Apply a migration file directly to Supabase
 * Usage: npx tsx scripts/apply-migration.ts supabase/migrations/00006_shark_narrative_content.sql
 */

import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    db: {
      schema: 'public'
    }
  }
);

async function applyMigration(filePath: string) {
  console.log(`📄 Reading migration: ${filePath}`);
  const sql = readFileSync(filePath, 'utf-8');

  console.log('🚀 Applying migration...\n');
  console.log(sql);
  console.log('\n');

  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

  if (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }

  console.log('✓ Migration applied successfully');
}

const filePath = process.argv[2];
if (!filePath) {
  console.error('Usage: npx tsx scripts/apply-migration.ts <migration-file>');
  process.exit(1);
}

applyMigration(filePath).catch(console.error);
