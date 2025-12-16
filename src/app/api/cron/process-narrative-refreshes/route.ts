import { NextRequest, NextResponse } from 'next/server'
import { processNarrativeRefreshes } from '@/lib/services/enrichment'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60 // 1 minute max (just flagging, not enriching)

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

  console.log('[CRON] Processing scheduled narrative refreshes at', new Date().toISOString())

  try {
    const result = await processNarrativeRefreshes()

    console.log('[CRON] Narrative refresh processing completed:', result)

    return NextResponse.json({
      success: true,
      message: `Flagged ${result.flagged} products for narrative refresh`,
      timestamp: new Date().toISOString(),
      stats: {
        flagged: result.flagged,
      },
      products: result.products.slice(0, 20), // Limit response size
    })
  } catch (error) {
    console.error('[CRON] Narrative refresh processing failed:', error)
    return NextResponse.json({
      error: 'Narrative refresh processing failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
