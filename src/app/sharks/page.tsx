import { Metadata } from 'next'
import Link from 'next/link'
import { getSharks, getAllSharkStats } from '@/lib/queries/sharks'

export const metadata: Metadata = {
  title: 'The Sharks | Shark Tank Products',
  description: 'Meet the Sharks and explore their investment portfolios. See success rates, total investments, and active companies.',
}

export default async function SharksPage() {
  const [sharks, stats] = await Promise.all([
    getSharks(),
    getAllSharkStats(),
  ])

  const statsMap = new Map(stats.map(s => [s.slug, s]))

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-2">The Sharks</h1>
        <p className="text-gray-600 mb-8">
          Meet the investors and explore their portfolios
        </p>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sharks.map(shark => {
            const sharkStats = statsMap.get(shark.slug)
            
            return (
              <Link
                key={shark.id}
                href={`/sharks/${shark.slug}`}
                className="border rounded-lg p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center text-2xl">
                    {shark.name.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold">{shark.name}</h2>
                    {shark.investment_style && (
                      <p className="text-sm text-gray-500">{shark.investment_style}</p>
                    )}
                  </div>
                </div>

                {sharkStats && (
                  <div className="grid grid-cols-3 gap-2 text-center text-sm">
                    <div className="bg-gray-50 rounded p-2">
                      <div className="font-semibold text-lg">{sharkStats.total_deals}</div>
                      <div className="text-gray-500">Deals</div>
                    </div>
                    <div className="bg-gray-50 rounded p-2">
                      <div className="font-semibold text-lg">{sharkStats.active_companies}</div>
                      <div className="text-gray-500">Active</div>
                    </div>
                    <div className="bg-gray-50 rounded p-2">
                      <div className="font-semibold text-lg">
                        {sharkStats.success_rate ? `${sharkStats.success_rate}%` : '-'}
                      </div>
                      <div className="text-gray-500">Success</div>
                    </div>
                  </div>
                )}
              </Link>
            )
          })}
        </div>

        {sharks.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No sharks found. Run migrations to seed shark data.
          </div>
        )}
      </div>
    </main>
  )
}
