import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

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

  console.log('[CRON] Starting daily deal enrichment at', new Date().toISOString())

  try {
    // Execute enrichment script
    const { stdout, stderr } = await execAsync(
      'npx tsx scripts/daily-enrich-pending.ts --limit 20',
      {
        env: {
          ...process.env,
          NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
          SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
          TAVILY_API_KEY: process.env.TAVILY_API_KEY,
          OPENAI_API_KEY: process.env.OPENAI_API_KEY,
        },
        timeout: 240000, // 4 minute timeout
      }
    )

    console.log('[CRON] Output:', stdout)
    if (stderr) console.error('[CRON] Errors:', stderr)

    return NextResponse.json({
      success: true,
      message: 'Daily enrichment completed successfully',
      timestamp: new Date().toISOString(),
      output: stdout.substring(0, 1000) // Limit output size
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
