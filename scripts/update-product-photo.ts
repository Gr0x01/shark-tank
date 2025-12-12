import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function updateProductPhoto(productNameOrSlug: string, localFilePath: string) {
  // Find the product
  const { data: product, error: fetchError } = await supabase
    .from('products')
    .select('id, name, slug, photo_url')
    .or(`name.ilike.%${productNameOrSlug}%,slug.eq.${productNameOrSlug}`)
    .single()

  if (fetchError || !product) {
    console.error('❌ Product not found:', productNameOrSlug)
    return
  }

  console.log(`📦 Found product: ${product.name} (${product.slug})`)
  console.log(`   Current photo: ${product.photo_url || 'None'}`)

  // Read the file
  const absolutePath = path.resolve(localFilePath)
  if (!fs.existsSync(absolutePath)) {
    console.error('❌ File not found:', absolutePath)
    return
  }

  const fileBuffer = fs.readFileSync(absolutePath)
  const fileExt = path.extname(localFilePath)
  const fileName = `${product.slug}${fileExt}`

  console.log(`📤 Uploading ${fileName} (${(fileBuffer.length / 1024).toFixed(1)} KB)...`)

  // Upload to Supabase Storage
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('product-photos')
    .upload(fileName, fileBuffer, {
      contentType: fileExt === '.webp' ? 'image/webp' : 'image/jpeg',
      upsert: true // Overwrite if exists
    })

  if (uploadError) {
    console.error('❌ Upload failed:', uploadError.message)
    return
  }

  console.log('✅ Uploaded to storage:', uploadData.path)

  // Get public URL
  const { data: publicUrlData } = supabase.storage
    .from('product-photos')
    .getPublicUrl(fileName)

  const publicUrl = publicUrlData.publicUrl

  console.log(`🔗 Public URL: ${publicUrl}`)

  // Update database
  const { error: updateError } = await supabase
    .from('products')
    .update({ photo_url: publicUrl })
    .eq('id', product.id)

  if (updateError) {
    console.error('❌ Database update failed:', updateError.message)
    return
  }

  console.log('✅ Database updated successfully!')
  console.log(`\n🎉 Photo updated for "${product.name}"`)
}

// Main execution
const productName = process.argv[2]
const filePath = process.argv[3]

if (!productName || !filePath) {
  console.error('Usage: npx tsx scripts/update-product-photo.ts "Product Name" path/to/image.webp')
  process.exit(1)
}

updateProductPhoto(productName, filePath)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
