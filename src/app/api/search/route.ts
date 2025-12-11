import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sanitizeSearchQuery, isValidSearchQuery } from '@/lib/utils/search'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q')

    // Validate query length and format
    if (!isValidSearchQuery(query)) {
      return NextResponse.json({ products: [] })
    }

    // Additional validation: check max length before sanitization
    if (query && query.length > 100) {
      return NextResponse.json(
        { products: [], error: 'Query too long' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const sanitizedQuery = sanitizeSearchQuery(query!)

    // Optimized query - only fetch fields needed for typeahead
    const { data, error } = await supabase
      .from('products_with_sharks')
      .select('slug, name, company_name, photo_url')
      .or(`name.ilike.%${sanitizedQuery}%,company_name.ilike.%${sanitizedQuery}%`)
      .order('air_date', { ascending: false, nullsFirst: false })
      .limit(5)

    if (error) throw error

    return NextResponse.json(
      { products: data || [] },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30',
        },
      }
    )
  } catch (error) {
    console.error('Search API error:', error)
    return NextResponse.json(
      { products: [], error: 'Search failed' },
      { status: 500 }
    )
  }
}
