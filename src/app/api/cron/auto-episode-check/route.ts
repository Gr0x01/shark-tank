import { NextRequest, NextResponse } from 'next/server'
import { checkForNewEpisodes, importMissingEpisode } from '@/lib/services/enrichment'
import type { EpisodeImportResult } from '@/lib/services/enrichment'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutes for full import pipeline

/**
 * Auto Episode Check & Import Cron Job
 *
 * 1. Checks TVMaze API for recently aired episodes
 * 2. For any missing episodes, discovers product names via Tavily web search
 * 3. Creates products and runs full enrichment (deal details, status, sharks)
 *
 * Runs daily at 6am UTC via Vercel Cron.
 */
export async function GET(request: NextRequest) {
  // Verify Vercel Cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    console.error('[CRON] Unauthorized auto-episode-check attempt')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

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

  console.log('[CRON] Starting automated episode check & import at', new Date().toISOString())

  try {
    // Step 1: Check for missing episodes (72-hour lookback catches Friday episodes over the weekend)
    const checkResult = await checkForNewEpisodes({ lookbackHours: 72 })
    console.log('[CRON] Episode check:', checkResult.message)

    if (checkResult.missingEpisodes.length === 0) {
      return NextResponse.json({
        success: true,
        message: checkResult.message,
        timestamp: new Date().toISOString(),
        stats: { recentEpisodes: checkResult.recentEpisodes, imported: 0 },
      })
    }

    // Step 2: Import each missing episode
    const importResults: EpisodeImportResult[] = []

    for (const ep of checkResult.missingEpisodes) {
      console.log(`[CRON] Importing S${ep.season}E${ep.episode}...`)
      try {
        const result = await importMissingEpisode(ep.season, ep.episode)
        importResults.push(result)
      } catch (err) {
        console.error(`[CRON] Failed to import S${ep.season}E${ep.episode}:`, err)
        importResults.push({
          season: ep.season,
          episode: ep.episode,
          productsDiscovered: 0,
          productsCreated: 0,
          productsEnriched: 0,
          productNames: [],
        })
      }
    }

    const totalCreated = importResults.reduce((sum, r) => sum + r.productsCreated, 0)
    const totalEnriched = importResults.reduce((sum, r) => sum + r.productsEnriched, 0)

    console.log(`[CRON] Import complete: ${totalCreated} products created, ${totalEnriched} enriched`)

    return NextResponse.json({
      success: true,
      message: `Imported ${totalCreated} products from ${importResults.length} episode(s)`,
      timestamp: new Date().toISOString(),
      stats: {
        recentEpisodes: checkResult.recentEpisodes,
        missingEpisodes: checkResult.missingEpisodes.length,
        imported: totalCreated,
        enriched: totalEnriched,
      },
      episodes: importResults,
    })
  } catch (error) {
    console.error('[CRON] Episode check/import failed:', error)
    return NextResponse.json({
      error: 'Episode check/import failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
