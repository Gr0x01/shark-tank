import { createClient } from '@/lib/supabase/server'
import type { Category, ProductWithSharks, Product } from '@/lib/supabase/types'

export async function getCategories(): Promise<Category[]> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .is('parent_id', null)
    .order('name')
  
  if (error) throw error
  return (data as Category[]) || []
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('slug', slug)
    .single()
  
  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  
  return data as Category
}

export async function getCategoryProducts(slug: string): Promise<ProductWithSharks[]> {
  const supabase = await createClient()
  
  const { data: categoryData } = await supabase
    .from('categories')
    .select('id')
    .eq('slug', slug)
    .single()
  
  const category = categoryData as Category | null
  if (!category) return []
  
  const { data, error } = await supabase
    .from('products_with_sharks')
    .select('*')
    .eq('category_id', category.id)
    .order('air_date', { ascending: false, nullsFirst: false })
  
  if (error) throw error
  return (data as ProductWithSharks[]) || []
}

export async function getCategoriesWithCounts(): Promise<(Category & { product_count: number })[]> {
  const supabase = await createClient()
  
  const { data: categoriesData, error: catError } = await supabase
    .from('categories')
    .select('*')
    .is('parent_id', null)
    .order('name')
  
  if (catError) throw catError
  
  const categories = (categoriesData as Category[]) || []
  
  const { data: productsData, error: prodError } = await supabase
    .from('products')
    .select('category_id')
  
  if (prodError) throw prodError
  
  const products = (productsData as Pick<Product, 'category_id'>[]) || []
  
  const counts = new Map<string, number>()
  products.forEach(p => {
    if (p.category_id) {
      counts.set(p.category_id, (counts.get(p.category_id) || 0) + 1)
    }
  })
  
  return categories.map(cat => ({
    ...cat,
    product_count: counts.get(cat.id) || 0
  }))
}
