import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

async function checkDataStatus() {
  // Check price data completeness
  const { data: priceData } = await supabase
    .from('products')
    .select('id, current_price, deal_amount')
    .limit(600)

  const total = priceData?.length || 0
  const withPrice = priceData?.filter(p => p.current_price !== null).length || 0
  const withDealAmount = priceData?.filter(p => p.deal_amount !== null).length || 0

  console.log('\n=== PRICE DATA COMPLETENESS ===')
  console.log(`Total products: ${total}`)
  console.log(`With current_price: ${withPrice} (${((withPrice/total)*100).toFixed(1)}%)`)
  console.log(`With deal_amount: ${withDealAmount} (${((withDealAmount/total)*100).toFixed(1)}%)`)

  // Get top 5 categories
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, slug')

  const { data: products } = await supabase
    .from('products')
    .select('category_id')

  const counts = new Map<string, number>()
  products?.forEach(p => {
    if (p.category_id) {
      counts.set(p.category_id, (counts.get(p.category_id) || 0) + 1)
    }
  })

  const categoriesWithCounts = categories?.map(cat => ({
    ...cat,
    product_count: counts.get(cat.id) || 0
  })).sort((a, b) => b.product_count - a.product_count).slice(0, 5)

  console.log('\n=== TOP 5 CATEGORIES ===')
  categoriesWithCounts?.forEach((cat, i) => {
    console.log(`${i+1}. ${cat.name} (${cat.slug}): ${cat.product_count} products`)
  })

  return {
    priceDataPercentage: ((withPrice/total)*100).toFixed(1),
    dealAmountPercentage: ((withDealAmount/total)*100).toFixed(1),
    topCategories: categoriesWithCounts
  }
}

checkDataStatus()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error)
    process.exit(1)
  })
