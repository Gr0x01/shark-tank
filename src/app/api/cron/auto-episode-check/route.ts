import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 600 // 10 minutes max (allows time for scraping + enrichment)

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

  console.log('[CRON] Starting automated episode check at', new Date().toISOString())

  try {
    // Execute auto episode workflow
    // Lookback 72 hours (to catch Friday episodes on Saturday/Sunday)
    const { stdout, stderr } = await execAsync(
      'npx tsx scripts/auto-episode-workflow.ts --lookback 72',
      {
        env: {
          ...process.env,
          NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
          SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
          TAVILY_API_KEY: process.env.TAVILY_API_KEY,
          OPENAI_API_KEY: process.env.OPENAI_API_KEY,
        },
        timeout: 540000, // 9 minute timeout (leaves 1min buffer)
      }
    )

    console.log('[CRON] Auto-episode-check output:', stdout)
    if (stderr) console.error('[CRON] Auto-episode-check stderr:', stderr)

    // Parse output to extract summary
    const productsCreatedMatch = stdout.match(/Products created: (\d+)/)
    const productsEnrichedMatch = stdout.match(/Products enriched: (\d+)/)
    const episodesMatch = stdout.match(/Episodes processed: (\d+)/)

    const productsCreated = productsCreatedMatch ? parseInt(productsCreatedMatch[1], 10) : 0
    const productsEnriched = productsEnrichedMatch ? parseInt(productsEnrichedMatch[1], 10) : 0
    const episodesProcessed = episodesMatch ? parseInt(episodesMatch[1], 10) : 0

    return NextResponse.json({
      success: true,
      message: `Auto episode check completed: ${episodesProcessed} episode(s), ${productsCreated} product(s) created, ${productsEnriched} enriched`,
      timestamp: new Date().toISOString(),
      stats: {
        episodesProcessed,
        productsCreated,
        productsEnriched,
      },
      output: stdout.substring(0, 2000) // Limit output size
    })
  } catch (error) {
    console.error('[CRON] Auto episode check failed:', error)
    return NextResponse.json({
      error: 'Auto episode check failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
