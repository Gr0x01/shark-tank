/**
 * Submit URLs to IndexNow for faster re-indexing by Bing, Yandex, etc.
 *
 * Usage:
 *   npx tsx scripts/submit-indexnow.ts           # Submit all product URLs
 *   npx tsx scripts/submit-indexnow.ts --dry-run # Preview URLs without submitting
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { submitUrlsToIndexNow } from '../src/lib/services/indexnow'

dotenv.config({ path: '.env.local' })

const SITE_URL = 'https://tankd.io'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

async function getAllProductSlugs(): Promise<string[]> {
  // PostgREST caps an unbounded select at 1000 rows, so this quietly submitted only
  // the 1000 most recently updated products once the catalogue outgrew that.
  const slugs: string[] = []
  const pageSize = 1000
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from('products')
      .select('slug')
      .order('updated_at', { ascending: false })
      .range(from, from + pageSize - 1)

    if (error) throw error
    if (!data?.length) break
    slugs.push(...data.map(p => p.slug))
    if (data.length < pageSize) break
  }
  return slugs
}

async function main() {
  const isDryRun = process.argv.includes('--dry-run')

  console.log('=== IndexNow URL Submission ===\n')

  // Get all product slugs
  const slugs = await getAllProductSlugs()
  console.log(`Found ${slugs.length} products`)

  // Build full URLs for products
  const productUrls = slugs.map(slug => `${SITE_URL}/products/${slug}`)

  // Add other important pages
  const staticUrls = [
    SITE_URL,
    `${SITE_URL}/products`,
    `${SITE_URL}/sharks`,
    `${SITE_URL}/categories`,
    `${SITE_URL}/seasons`,
    `${SITE_URL}/still-in-business`,
    `${SITE_URL}/out-of-business`,
    `${SITE_URL}/success-stories`,
    `${SITE_URL}/best-deals`,
    `${SITE_URL}/deals/under-100k`,
    `${SITE_URL}/deals/100k-to-500k`,
    `${SITE_URL}/deals/over-500k`,
    `${SITE_URL}/how-to-apply`,
    `${SITE_URL}/about`,
  ]

  const allUrls = [...staticUrls, ...productUrls]

  console.log(`Total URLs to submit: ${allUrls.length}`)
  console.log(`\nSample URLs:`)
  allUrls.slice(0, 5).forEach(url => console.log(`  - ${url}`))
  console.log(`  ... and ${allUrls.length - 5} more`)

  if (isDryRun) {
    console.log('\n[DRY RUN] Skipping actual submission')
    return
  }

  await submitUrlsToIndexNow(allUrls)

  console.log('\n=== Done ===')
  console.log('URLs have been submitted to IndexNow.')
  console.log('Bing, Yandex, Seznam, and Naver will re-crawl these pages soon.')
  console.log('(Note: Google uses its own system and does not support IndexNow)')
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error:', error)
    process.exit(1)
  })
