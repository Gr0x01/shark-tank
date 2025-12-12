import { NextResponse } from 'next/server'
import { getLatestEpisode } from '@/lib/queries/episodes'
import { SITE_URL } from '@/lib/seo/constants'

export async function GET() {
  try {
    const episode = await getLatestEpisode()

    if (!episode) {
      // No episodes found, redirect to episodes listing
      return NextResponse.redirect(new URL('/episodes', SITE_URL))
    }

    // Redirect to the latest episode page
    const redirectUrl = new URL(
      `/episodes/${episode.season}/${episode.episode_number}`,
      SITE_URL
    )

    // Use 307 (Temporary Redirect) since the target changes weekly
    return NextResponse.redirect(redirectUrl, { status: 307 })
  } catch (error) {
    console.error('Error fetching latest episode:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })
    return NextResponse.redirect(new URL('/episodes', SITE_URL))
  }
}
