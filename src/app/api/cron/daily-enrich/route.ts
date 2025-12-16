import { NextRequest, NextResponse } from 'next/server'
import { enrichPendingDeals } from '@/lib/services/enrichment'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutes max execution

export async function GET(request: NextRequest) {
  // Verify Vercel Cron secret (security)
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    console.error('[CRON] Unauthorized request attempt')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Validate required environment variables
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'TAVILY_API_KEY',
    'OPENAI_API_KEY',
  ] as const

  const missingVars = requiredEnvVars.filter(v => !process.env[v])
  if (missingVars.length > 0) {
    console.error('[CRON] Missing required environment variables:', missingVars)
    return NextResponse.json({
      error: 'Configuration error',
      message: `Missing environment variables: ${missingVars.join(', ')}`,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }

  console.log('[CRON] Starting daily deal enrichment at', new Date().toISOString())

  try {
    const result = await enrichPendingDeals({
      limit: 20,
      minAgeHours: 24,
      maxAttempts: 7,
    })

    console.log('[CRON] Daily enrichment completed:', result)

    return NextResponse.json({
      success: true,
      message: `Daily enrichment completed: ${result.updated} updated, ${result.skipped} skipped, ${result.failed} failed`,
      timestamp: new Date().toISOString(),
      stats: {
        processed: result.processed,
        updated: result.updated,
        skipped: result.skipped,
        failed: result.failed,
      },
      products: result.products.slice(0, 20), // Limit response size
    })
  } catch (error) {
    console.error('[CRON] Enrichment failed:', error)
    return NextResponse.json({
      error: 'Enrichment failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
