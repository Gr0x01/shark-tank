import { NextRequest, NextResponse } from 'next/server'
import { checkForNewEpisodes } from '@/lib/services/enrichment'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60 // 1 minute max (just checking, not enriching)

/**
 * Auto Episode Check Cron Job
 *
 * Checks TVMaze API for recently aired episodes and reports if any are missing
 * from the database. Does NOT auto-import (Playwright scraping can't run in serverless).
 *
 * If missing episodes are found, run the manual workflow:
 *   npx tsx scripts/new-episode.ts "Product Name" --season X --episode Y
 */
export async function GET(request: NextRequest) {
  // Verify Vercel Cron secret (security)
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    console.error('[CRON] Unauthorized auto-episode-check attempt')
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

  console.log('[CRON] Starting automated episode check at', new Date().toISOString())

  try {
    // Check for episodes in last 72 hours (catches Friday episodes on weekends)
    const result = await checkForNewEpisodes({ lookbackHours: 72 })

    console.log('[CRON] Episode check completed:', result)

    // If missing episodes found, log instruction for manual import
    if (result.missingEpisodes.length > 0) {
      console.log('[CRON] ACTION REQUIRED: Missing episodes detected!')
      console.log('[CRON] Run manual import for each:')
      for (const ep of result.missingEpisodes) {
        console.log(`[CRON]   npx tsx scripts/new-episode.ts "ProductName" --season ${ep.season} --episode ${ep.episode}`)
      }
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      timestamp: new Date().toISOString(),
      stats: {
        recentEpisodes: result.recentEpisodes,
        missingEpisodes: result.missingEpisodes.length,
      },
      missingEpisodes: result.missingEpisodes,
    })
  } catch (error) {
    console.error('[CRON] Episode check failed:', error)
    return NextResponse.json({
      error: 'Episode check failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
