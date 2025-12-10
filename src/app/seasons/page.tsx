import { Metadata } from 'next'
import Link from 'next/link'
import { getSeasons, getSeasonStats } from '@/lib/queries/episodes'

export const metadata: Metadata = {
  title: 'All Seasons | Shark Tank Products',
  description: 'Browse all 16+ seasons of Shark Tank. See every product pitched and every deal made.',
}

export default async function SeasonsPage() {
  const seasons = await getSeasons()
  
  const seasonData = await Promise.all(
    seasons.map(async (season) => ({
      number: season,
      stats: await getSeasonStats(season),
    }))
  )

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-2">All Seasons</h1>
        <p className="text-gray-600 mb-8">
          Browse products by season
        </p>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {seasonData.map(({ number, stats }) => (
            <Link
              key={number}
              href={`/seasons/${number}`}
              className="border rounded-lg p-6 hover:shadow-lg transition-shadow"
            >
              <h2 className="text-2xl font-bold mb-2">Season {number}</h2>
              <div className="text-sm text-gray-600 space-y-1">
                <p>{stats.total} products</p>
                <p>{stats.deals} got deals</p>
                <p className="text-green-600">{stats.active} still active</p>
              </div>
            </Link>
          ))}
        </div>

        {seasons.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No seasons found. Products need episode data to show seasons.
          </div>
        )}
      </div>
    </main>
  )
}
