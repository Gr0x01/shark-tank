import { Metadata } from 'next'
import Link from 'next/link'
import { getSharks, getAllSharkStats, getLeaderboardSharks } from '@/lib/queries/sharks'
import { SharkImage } from '@/components/ui/SharkImage'
import { SharkLeaderboard } from '@/components/ui/SharkLeaderboard'

export const metadata: Metadata = {
  title: 'The Sharks | Shark Tank Products',
  description: 'Meet the Sharks and explore their investment portfolios. See success rates, total investments, and active companies.',
}

export default async function SharksPage() {
  const [sharks, stats, leaderboard] = await Promise.all([
    getSharks(),
    getAllSharkStats(),
    getLeaderboardSharks(),
  ])

  const statsMap = new Map(stats.map(s => [s.slug, s]))

  return (
    <main className="min-h-screen py-12 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-10">
          <p className="section-label mb-2">The Investors</p>
          <h1 className="text-3xl md:text-4xl font-medium mb-2">Meet the Sharks</h1>
          <p className="text-[var(--ink-500)]">
            Explore their portfolios, success rates, and investment styles
          </p>
        </div>

        {/* Leaderboard */}
        <SharkLeaderboard
          mostDeals={leaderboard.mostDeals}
          highestSuccess={leaderboard.highestSuccess}
          biggestInvestor={leaderboard.biggestInvestor}
        />

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sharks.map(shark => {
            const sharkStats = statsMap.get(shark.slug)
            
            return (
              <Link
                key={shark.id}
                href={`/sharks/${shark.slug}`}
                className="card group"
              >
                <div className="flex items-center gap-4 mb-5">
                  <SharkImage 
                    src={shark.photo_url}
                    name={shark.name}
                    size="lg"
                    className="group-hover:border-[var(--cyan-600)]"
                  />
                  <div>
                    <h2 className="text-xl font-display font-medium text-[var(--ink-900)] group-hover:text-[var(--cyan-600)] transition-colors">
                      {shark.name}
                    </h2>
                    {shark.investment_style && (
                      <p className="text-sm text-[var(--ink-500)]">{shark.investment_style}</p>
                    )}
                  </div>
                </div>

                {sharkStats && (
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-[var(--off-white)] rounded p-2.5">
                      <div className="font-display font-medium text-lg text-[var(--ink-900)]">{sharkStats.total_deals}</div>
                      <div className="text-[var(--ink-400)] text-xs font-display uppercase tracking-wide">Deals</div>
                    </div>
                    <div className="bg-[var(--off-white)] rounded p-2.5">
                      <div className="font-display font-medium text-lg text-[var(--success)]">{sharkStats.active_companies}</div>
                      <div className="text-[var(--ink-400)] text-xs font-display uppercase tracking-wide">Active</div>
                    </div>
                    <div className="bg-[var(--off-white)] rounded p-2.5">
                      <div className="font-display font-medium text-lg text-[var(--ink-900)]">
                        {sharkStats.success_rate ? `${sharkStats.success_rate}%` : '—'}
                      </div>
                      <div className="text-[var(--ink-400)] text-xs font-display uppercase tracking-wide">Success</div>
                    </div>
                  </div>
                )}
              </Link>
            )
          })}
        </div>

        {sharks.length === 0 && (
          <div className="text-center py-16 text-[var(--ink-400)] card">
            <p className="font-display">No sharks found. Run migrations to seed shark data.</p>
          </div>
        )}
      </div>
    </main>
  )
}
