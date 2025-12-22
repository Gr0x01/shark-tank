/**
 * Submit URLs to IndexNow for faster re-indexing by Bing, Yandex, etc.
 *
 * Usage:
 *   npx tsx scripts/submit-indexnow.ts           # Submit all product URLs
 *   npx tsx scripts/submit-indexnow.ts --dry-run # Preview URLs without submitting
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const INDEXNOW_KEY = '7b7efa2918524d59b14d971a617e79aa'
const SITE_URL = 'https://tankd.io'
const INDEXNOW_API = 'https://api.indexnow.org/indexnow'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

async function getAllProductSlugs(): Promise<string[]> {
  const { data, error } = await supabase
    .from('products')
    .select('slug')
    .order('updated_at', { ascending: false })

  if (error) throw error
  return data?.map(p => p.slug) || []
}

async function submitToIndexNow(urls: string[]): Promise<void> {
  // IndexNow accepts up to 10,000 URLs per request
  const batchSize = 10000

  for (let i = 0; i < urls.length; i += batchSize) {
    const batch = urls.slice(i, i + batchSize)

    const payload = {
      host: 'tankd.io',
      key: INDEXNOW_KEY,
      keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
      urlList: batch
    }

    console.log(`\nSubmitting batch ${Math.floor(i / batchSize) + 1} (${batch.length} URLs)...`)

    try {
      const response = await fetch(INDEXNOW_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (response.ok || response.status === 202) {
        console.log(`✓ Batch submitted successfully (status: ${response.status})`)
      } else {
        const text = await response.text()
        console.error(`✗ Failed to submit batch: ${response.status} ${text}`)
        // Continue with remaining batches even if one fails
      }
    } catch (error) {
      console.error(`✗ Network error submitting batch:`, error)
      // Continue with remaining batches
    }

    // Small delay between batches to avoid rate limiting
    if (i + batchSize < urls.length) {
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }
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

  await submitToIndexNow(allUrls)

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
