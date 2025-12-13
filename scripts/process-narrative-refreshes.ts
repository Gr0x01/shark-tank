#!/usr/bin/env tsx
/**
 * Process Scheduled Narrative Refreshes
 *
 * Finds products where deal details were changed > 1 hour ago and flags them
 * for narrative re-enrichment. This creates a "cooldown" period so that multiple
 * edits during episode watching batch together into a single narrative refresh.
 *
 * Flow:
 * 1. User updates deal details → trigger sets narrative_refresh_scheduled_at
 * 2. User makes more edits → trigger updates narrative_refresh_scheduled_at again
 * 3. 1 hour passes with no changes
 * 4. This script runs → flags product (sets narrative_version = 0)
 * 5. Daily enrichment cron picks it up and regenerates narrative
 *
 * Usage:
 *   npx tsx scripts/process-narrative-refreshes.ts
 */

import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('⏰ Processing Scheduled Narrative Refreshes');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Call the database function to process scheduled refreshes
  const { data: flaggedProducts, error } = await supabase.rpc(
    'process_scheduled_narrative_refreshes'
  );

  if (error) {
    console.error('❌ Error processing scheduled refreshes');
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });

    // Log database connection info (without credentials)
    console.error('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.error('Service key configured:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);

    process.exit(1);
  }

  // Validate return type
  if (!Array.isArray(flaggedProducts)) {
    console.error('❌ Unexpected response from database function:', flaggedProducts);
    process.exit(1);
  }

  if (flaggedProducts.length === 0) {
    console.log('   No products ready for narrative refresh (cooldown period not elapsed)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    return;
  }

  console.log(`   ✅ Flagged ${flaggedProducts.length} product(s) for narrative refresh:\n`);

  for (const product of flaggedProducts) {
    const scheduledAt = new Date(product.scheduled_at);
    const hoursSince = ((Date.now() - scheduledAt.getTime()) / 1000 / 60 / 60).toFixed(1);
    console.log(`      • ${product.product_name}`);
    console.log(`        Last changed: ${scheduledAt.toLocaleString()} (${hoursSince}h ago)`);
  }

  console.log('\n   These products will be enriched by the next run of:');
  console.log('   npx tsx scripts/enrich-narratives.ts');
  console.log('   (or automatically via daily cron at 10am UTC)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main();
