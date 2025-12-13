import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

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

  console.log('[CRON] Processing scheduled narrative refreshes at', new Date().toISOString())

  try {
    // Execute narrative refresh processing script
    const { stdout, stderr } = await execAsync(
      'npx tsx scripts/process-narrative-refreshes.ts',
      {
        env: {
          NODE_ENV: process.env.NODE_ENV,
          NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
          SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
        },
        timeout: 30000, // 30 second timeout
      }
    )

    console.log('[CRON] Output:', stdout)
    if (stderr) console.error('[CRON] Errors:', stderr)

    return NextResponse.json({
      success: true,
      message: 'Narrative refresh processing completed successfully',
      timestamp: new Date().toISOString(),
      output: stdout.substring(0, 1000) // Limit output size
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
